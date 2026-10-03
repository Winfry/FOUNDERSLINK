"""Find the passages Ask Compliance may answer from.

Built once when the AI service starts (load_retriever), then called for each
question. It reads the index ingest.py wrote and never the database
(FUNDING_FLOW F5): everything about the founder arrives in the request.

What it does for each question:

  1. Leaves out what may not be quoted: anything past its review date
     (TEAM_DECISIONS D3.5), demo items, and other counties' rules.
  2. Searches two ways and combines them. Meaning search (the multilingual
     embedding model) finds "how do I register my business data?" in
     English, Swahili or Sheng. Word search (BM25) finds exact terms the
     embedding model blurs: eTIMS, SHIF, AGPO, "section 18D", "DPR1".
  3. Gives a small, explained boost to the regulator a question names
     ("KRA", "data protection") instead of the old hard filter, which
     returned nothing at all when the guess was wrong.
  4. Adds the neighbouring piece when a section was split in two, so an
     answer sees the whole of "(1)...(7)", not half of it.
  5. Answers "what does X mean?" (or "maana ya X ni nini?") from the
     definition of X when the law defines it.
  6. Says how relevant the best passage is and whether the founder's county
     is covered, so answer.py can decline instead of guessing.

The index is small (thousands of pieces, not millions), so it is held in
memory: searching it takes milliseconds and the filters are plain Python.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date

import numpy as np

from ai.compliance_rag.ingest import COLLECTION, INDEX_DIR, MANIFEST, county_key

log = logging.getLogger(__name__)

# The 47 counties, as the backend lists them (backend/src/shared/constants.ts).
COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
    "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
    "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
    "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
    "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
    "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
]

# How alike a question and a passage must be, in the embedding model's
# cosine similarity, before the passage counts as relevant. multilingual-e5
# scores almost everything between 0.7 and 0.9, so this must be calibrated
# on ai/evaluation/datasets/compliance_questions.jsonl; 0.80 is a starting point.
RELEVANCE_THRESHOLD = float(os.getenv("COMPLIANCE_RELEVANCE_THRESHOLD", "0.80"))

# Reciprocal rank fusion: a passage's score is the sum of 1 / (RRF_K + rank)
# over the two searches. 60 is the usual constant; it stops one list's top
# result from drowning out agreement between the two.
RRF_K = 60
# Each search proposes this many candidates before they are combined.
CANDIDATES = 30

# A question that names a regulator nudges its passages up. Small next to a
# good rank (1 / (60 + 1) is about 0.016), so it breaks ties, not rankings.
REGULATOR_BOOST = 0.004
REGULATOR_TERMS = {
    "KRA": r"\b(kra|tax|taxes|vat|pin|etims|tims|turnover|income tax|paye|excise|withholding|kodi|ushuru)\b",
    "ODPC": r"\b(odpc|data protection|personal data|data controller|data processor|privacy|data commissioner|data ya)\b",
    "BRS": r"\b(brs|business name|register (a|my) (business|company)|incorporat\w*|company registration|directors?|shares?)\b",
    "NSSF": r"\b(nssf|pension|social security)\b",
    "SHA": r"\b(sha|shif|nhif|health insurance)\b",
}
# Questions about these need the founder's county.
COUNTY_TERMS = r"\b(county|permit|single business permit|sbp|unified business permit|ubp|kaunti|leseni)\b"

# Founders' words for what the law calls something else. Added to word
# search only (meaning search gets the question as asked). English and Swahili.
QUERY_SYNONYMS = {
    r"\b(cost|costs|how much|price|charge[sd]?|pay|gharama|bei|kulipa)\b": "fee fees kshs",
    r"\b(penalt(y|ies)|punish\w*|jail|faini|adhabu)\b": "fine offence penalty imprisonment",
    r"\b(small business|small company|sme|biashara ndogo)\b": "micro small",
    r"\b(staff|workers|wafanyakazi)\b": "employee employees",
    r"\b(sign ?up|apply|kujiandikisha|usajili)\b": "registration application register",
    r"\b(renew\w*)\b": "renewal",
    r"\b(exempt\w*|don'?t have to|do not have to|not required)\b": "exemption exempt",
}


def expand(question: str) -> str:
    extra = [words for pattern, words in QUERY_SYNONYMS.items() if re.search(pattern, question.lower())]
    return " ".join([question, *extra])


# Found the law's own definition of the term asked about: worth more than a
# first place in either search (1 / (60 + 1) is about 0.016).
DEFINITION_BOOST = 0.05

# Words too common to help word search. English and a few Swahili.
STOPWORDS = set("""
a an and are as at be by can do does for from has have how i if in is it its me my of on or our
should that the their there these this to under what when where which who will with without you your
ni na ya wa za la kwa je nini gani katika hii huo hiyo kama
""".split())


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

@dataclass
class Passage:
    id: str
    text: str
    source_id: str
    source_title: str
    section: str
    page: int | None
    url: str
    institution: str
    regulator: str
    last_verified_at: str
    jurisdiction_level: str
    county: str
    doc_type: str               # "item" (plain-language checklist entry) or "source" (the law itself)
    score: float                # combined rank score, for ordering only
    similarity: float | None    # cosine similarity to the question; None without embeddings
    why: list[str] = field(default_factory=list)  # how it was found, for logs and evaluation


@dataclass
class Retrieval:
    passages: list[Passage]
    best_similarity: float | None
    relevant: bool              # best passage clears RELEVANCE_THRESHOLD (or word search found the rare terms)
    county: str | None          # the county the answer is about, if any
    county_status: str          # "covered", "not_covered", "not_needed" or "unknown"
    covered_counties: list[str]
    hidden_overdue: int         # passages left out because they are past review (for the admin report)


class IndexNotReady(Exception):
    """No index, or one built with a different embedding model."""


# ---------------------------------------------------------------------------
# Word search
# ---------------------------------------------------------------------------

def stem(word: str) -> str:
    """Light English suffix stripping, so "means" finds "mean", "registering"
    finds "register" and "employees" finds "employee". Deliberately crude:
    short words, numbers and names like "etims" are left alone."""
    if len(word) <= 3 or not word.isalpha() or word.endswith("ss"):
        return word
    for suffix, keep in (("ies", "y"), ("ing", ""), ("ed", ""), ("es", ""), ("s", "")):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            if suffix == "es" and not word.endswith(("ses", "xes", "zes", "ches", "shes")):
                suffix, keep = "s", ""
            return word[: len(word) - len(suffix)] + keep
    return word


def tokenize(text: str) -> list[str]:
    text = text.lower().replace("’", "'")
    return [stem(t) for t in re.findall(r"[a-z0-9]+(?:[.'][a-z0-9]+)*", text) if t not in STOPWORDS]


# "what does personal data mean", "what is a data controller", "define turnover",
# "meaning of data subject", "maana ya data binafsi ni nini"
_DEFINITION_QUESTION = [
    re.compile(r"what (?:does|do) (?:the term |the word )?[\"'“]?(.+?)[\"'”]? mean\b", re.I),
    re.compile(r"what (?:is|are) (?:a |an |the )?(?:meaning of |definition of )?[\"'“]?(.+?)[\"'”]?\s*\??$", re.I),
    re.compile(r"(?:define|definition of|meaning of|maana ya)\s+(?:a |an |the )?[\"'“]?(.+?)[\"'”]?(?:\s+ni nini)?\s*\??$", re.I),
]
_DEFINED_TERM = re.compile(r'definition of "([^"]+)"$')


def defined_term_asked(question: str) -> str | None:
    q = question.strip()
    for pattern in _DEFINITION_QUESTION:
        m = pattern.search(q)
        if m:
            term = re.sub(r"\s+", " ", m.group(1)).strip(" ?.").lower()
            return term or None
    return None


class BM25:
    """Okapi BM25 over the in-memory pieces. k1 and b are the usual defaults."""

    def __init__(self, docs: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.tf = [Counter(d) for d in docs]
        self.len = np.array([len(d) for d in docs], dtype=float)
        self.avg = float(self.len.mean()) if len(docs) else 0.0
        df = Counter(t for d in docs for t in set(d))
        n = len(docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def scores(self, query: list[str]) -> np.ndarray:
        out = np.zeros(len(self.tf))
        for t in set(query):
            idf = self.idf.get(t)
            if idf is None:
                continue
            for i, tf in enumerate(self.tf):
                f = tf.get(t)
                if f:
                    denom = f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg)
                    out[i] += idf * f * (self.k1 + 1) / denom
        return out

    def rare_terms(self, query: list[str], max_df_share: float = 0.02) -> list[str]:
        """Query words found in only a few pieces: names like eTIMS or DPR1."""
        n = max(len(self.tf), 1)
        threshold = math.log(1 + (n - max_df_share * n + 0.5) / (max_df_share * n + 0.5))
        return [t for t in set(query) if self.idf.get(t, 0) >= threshold and len(t) > 2]


# ---------------------------------------------------------------------------
# The retriever
# ---------------------------------------------------------------------------

def _int_date(d: date) -> int:
    return int(d.strftime("%Y%m%d"))


def _county_in(text: str) -> str | None:
    """A county named in the question, as a county_key."""
    low = " " + re.sub(r"[^a-z' ]", " ", text.lower()) + " "
    for name in sorted(COUNTIES, key=len, reverse=True):
        variants = {name.lower(), name.lower().replace("'", ""), name.lower().replace(" ", "-")}
        if any(f" {v} " in low for v in variants):
            return county_key(name)
    return None


class Retriever:
    def __init__(self, ids, texts, metas, vectors, embedder, model_name: str | None):
        self.ids = ids
        self.texts = texts
        self.metas = metas
        self.position = {cid: i for i, cid in enumerate(ids)}
        self.embedder = embedder
        self.vectors = vectors  # rows normalised by ingest, so a dot product is the cosine
        self.bm25 = BM25([tokenize(t) for t in texts])
        self.covered = sorted({m["county"] for m in metas if m.get("county")})
        # Dense search needs the question embedded by the same model as the index.
        self.dense = embedder is not None and vectors is not None and model_name == getattr(embedder, "model_name", None)
        if embedder is not None and not self.dense:
            log.error("Compliance index was built with %r but the service loaded %r: using word search only. "
                      "Rebuild the index with python -m ai.compliance_rag.ingest.",
                      model_name, getattr(embedder, "model_name", None))

    # -- filters ----------------------------------------------------------

    def _allowed(self, today: date, county: str | None) -> tuple[np.ndarray, int]:
        """Which pieces may be quoted today, for this county."""
        today_int = _int_date(today)
        mask = np.ones(len(self.ids), dtype=bool)
        overdue = 0
        for i, m in enumerate(self.metas):
            if m.get("is_demo"):
                mask[i] = False
            elif int(m.get("next_review_int", 99991231)) < today_int:
                mask[i] = False
                overdue += 1
            elif m.get("jurisdiction_level") == "county" and m.get("county") != county:
                # Another county's permit rules are worse than none: never generalise from Nairobi.
                mask[i] = False
        return mask, overdue

    # -- search -----------------------------------------------------------

    def search(self, question: str, profile: dict | None = None, k: int = 6,
               today: date | None = None) -> Retrieval:
        today = today or date.today()
        profile = profile or {}

        # Which county the answer is about: the one the question names, else the founder's own.
        county = _county_in(question) or (county_key(profile["county"]) if profile.get("county") else None)
        needs_county = bool(re.search(COUNTY_TERMS, question.lower()))
        if not needs_county:
            county_status = "not_needed"
        elif county is None:
            county_status = "unknown"
        else:
            county_status = "covered" if county in self.covered else "not_covered"

        mask, overdue = self._allowed(today, county)
        allowed = np.flatnonzero(mask)
        if len(allowed) == 0:
            return Retrieval([], None, False, county, county_status, self.covered, overdue)

        why: dict[int, list[str]] = {}
        fused: dict[int, float] = {}

        # Meaning search.
        sims = None
        if self.dense:
            q = np.asarray(self.embedder.encode_query(question), dtype=float)
            sims = self.vectors @ q
            order = allowed[np.argsort(-sims[allowed])][:CANDIDATES]
            for rank, i in enumerate(order, start=1):
                fused[i] = fused.get(i, 0.0) + 1 / (RRF_K + rank)
                why.setdefault(i, []).append(f"meaning #{rank} ({sims[i]:.2f})")

        # Word search.
        terms = tokenize(expand(question))
        bm = self.bm25.scores(terms)
        hits = allowed[bm[allowed] > 0]
        order = hits[np.argsort(-bm[hits])][:CANDIDATES]
        for rank, i in enumerate(order, start=1):
            fused[i] = fused.get(i, 0.0) + 1 / (RRF_K + rank)
            why.setdefault(i, []).append(f"words #{rank}")

        # Regulator named in the question.
        named = [reg for reg, pattern in REGULATOR_TERMS.items() if re.search(pattern, question.lower())]
        for i in list(fused):
            if self.metas[i].get("regulator") in named:
                fused[i] += REGULATOR_BOOST
                why[i].append(f"names {self.metas[i]['regulator']}")
        # "What does X mean?" and the law defines X.
        term = defined_term_asked(question)
        if term:
            for i in allowed:
                m = _DEFINED_TERM.search(self.metas[i].get("section", ""))
                if m and m.group(1).lower() in (term, term.removeprefix("a ").removeprefix("an ")):
                    fused[i] = fused.get(i, 0.0) + DEFINITION_BOOST
                    why.setdefault(i, []).append(f'defines "{m.group(1)}"')
        # The founder's own county, when the question is about permits.
        if county and needs_county:
            for i in list(fused):
                if self.metas[i].get("county") == county:
                    fused[i] += REGULATOR_BOOST
                    why[i].append("her county")

        ranked = sorted(fused, key=fused.get, reverse=True)[:k]
        passages = [self._passage(i, fused[i], sims, why[i]) for i in ranked]
        passages = self._with_neighbours(passages, mask, sims)

        best = max((p.similarity for p in passages if p.similarity is not None), default=None)
        rare = self.bm25.rare_terms(terms)
        rare_found = bool(rare) and any(t in tokenize(p.text) for p in passages[:3] for t in rare)
        relevant = (best is not None and best >= RELEVANCE_THRESHOLD) or (not self.dense and rare_found)
        return Retrieval(passages, best, relevant, county, county_status, self.covered, overdue)

    def _passage(self, i: int, score: float, sims, why) -> Passage:
        m = self.metas[i]
        return Passage(
            id=self.ids[i], text=self.texts[i],
            source_id=m.get("source_id", ""), source_title=m.get("source_title", ""),
            section=m.get("section", ""), page=m.get("page") or None, url=m.get("url", ""),
            institution=m.get("institution", ""), regulator=m.get("regulator", ""),
            last_verified_at=m.get("last_verified_at", ""),
            jurisdiction_level=m.get("jurisdiction_level", ""), county=m.get("county", ""),
            doc_type=m.get("doc_type", ""), score=float(score),
            similarity=float(sims[i]) if sims is not None else None, why=list(why),
        )

    def _with_neighbours(self, passages: list[Passage], mask, sims) -> list[Passage]:
        """Put the other pieces of a split section next to the piece that was found.

        Ingest numbers a source's pieces in order ("finance_act_2026:41"), so
        the pieces either side of a hit share its section when it was split.
        """
        out: list[Passage] = []
        seen = {p.id for p in passages}
        for p in passages:
            out.append(p)
            source, _, n = p.id.rpartition(":")
            if p.doc_type != "source" or not n.isdigit():
                continue
            for neighbour in (f"{source}:{int(n) - 1}", f"{source}:{int(n) + 1}"):
                j = self.position.get(neighbour)
                if j is None or neighbour in seen or not mask[j] or self.metas[j].get("section") != p.section:
                    continue
                seen.add(neighbour)
                out.append(self._passage(j, p.score, sims, [f"same section as {p.id}"]))
        # Keep each section's pieces in reading order.
        order = {pid: i for i, pid in enumerate(self.ids)}
        grouped: dict[tuple[str, str], list[Passage]] = {}
        for p in out:
            grouped.setdefault((p.source_id, p.section), []).append(p)
        result: list[Passage] = []
        for group in grouped.values():
            result.extend(sorted(group, key=lambda q: order.get(q.id, 0)))
        return result


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load_retriever(embedder) -> Retriever:
    """Read the whole index into memory. Call once, at service start-up."""
    import chromadb

    if not MANIFEST.exists():
        raise IndexNotReady(f"No compliance index at {INDEX_DIR}. Run: python -m ai.compliance_rag.ingest")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    try:
        collection = chromadb.PersistentClient(path=str(INDEX_DIR)).get_collection(COLLECTION)
    except Exception as e:  # chromadb raises its own NotFoundError type
        raise IndexNotReady(f"Compliance index at {INDEX_DIR} is unreadable: {e}") from e

    got = collection.get(include=["documents", "metadatas", "embeddings"])
    if not got["ids"]:
        raise IndexNotReady("Compliance index is empty")
    vectors = np.asarray(got["embeddings"], dtype=float)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    vectors = vectors / np.where(norms == 0, 1, norms)
    log.info("Loaded compliance index: %d pieces built %s with %s",
             len(got["ids"]), manifest.get("built_at"), manifest.get("embedding_model"))
    return Retriever(got["ids"], got["documents"], got["metadatas"], vectors, embedder,
                     manifest.get("embedding_model"))
