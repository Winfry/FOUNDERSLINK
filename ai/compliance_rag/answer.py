from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path

import httpx

from ai.compliance_rag.chunking import estimate_tokens
from ai.compliance_rag.retrieve import Passage, Retrieval, Retriever
from ai.explanations.messages import language_of

log = logging.getLogger(__name__)

PROMPT_FILE = Path(__file__).parent / "prompts" / "answer_with_citations.txt"

# The backend waits 8 seconds in total. Retrieval takes milliseconds; leave
# the rest of the budget to the LLM, with a margin for the network.
LLM_TIMEOUT_S = float(os.getenv("LLM_TIMEOUT_S", "6"))
# Passages handed to the LLM. Enough for a section and its neighbours plus a
# definition or two; more just slows the answer and dilutes it.
MAX_PASSAGES = 8
CONTEXT_TOKEN_BUDGET = 3000
MAX_ANSWER_TOKENS = 500

LANGUAGE_NAMES = {"en": "English", "sw": "Kiswahili"}

MESSAGES = {
    "not_found": {
        "en": "I couldn't find an answer to this in the official sources FounderLink has checked. "
              "A verified expert can help with this question.",
        "sw": "Sikupata jibu la swali hili katika vyanzo rasmi ambavyo FounderLink imethibitisha. "
              "Mtaalamu aliyethibitishwa anaweza kukusaidia na swali hili.",
    },
    "county_not_covered": {
        "en": "FounderLink doesn't have checked sources for {county} County yet, and rules differ by county, "
              "so please check with the {county} County government. A verified expert can also help.",
        "sw": "FounderLink bado haina vyanzo vilivyothibitishwa vya Kaunti ya {county}, na sheria hutofautiana "
              "kati ya kaunti, kwa hivyo tafadhali wasiliana na serikali ya Kaunti ya {county}. "
              "Mtaalamu aliyethibitishwa pia anaweza kusaidia.",
    },
    "county_unknown": {
        "en": "County rules differ across Kenya. Add your county to your profile, or name it in your question, "
              "and I'll check the sources for that county.",
        "sw": "Sheria za kaunti hutofautiana kote Kenya. Ongeza kaunti yako kwenye wasifu wako, au uitaje "
              "katika swali lako, nami nitaangalia vyanzo vya kaunti hiyo.",
    },
}


class AnswerUnavailable(Exception):
    """No answer could be made here; the backend should use its stand-in."""


@dataclass
class Citation:
    source: str
    url: str
    last_verified: str | None


@dataclass
class ComplianceAnswer:
    answer: str
    citations: list[Citation]
    confident: bool
    suggest_expert: bool
    # Not part of the backend contract; for logs and evaluation.
    reason: str = ""

    def to_dict(self) -> dict:
        return {
            "answer": self.answer,
            "citations": [c.__dict__ for c in self.citations],
            "confident": self.confident,
            "suggest_expert": self.suggest_expert,
        }


# ---------------------------------------------------------------------------
# The LLM
# ---------------------------------------------------------------------------

class ChatClient:
    """Any provider with an OpenAI-style /chat/completions endpoint.

    OpenAI, Google Gemini, Groq, OpenRouter, Anthropic and a local Ollama all
    offer one, so the provider is chosen in .env, not in code:

        LLM_BASE_URL=https://api.openai.com/v1
        LLM_API_KEY=...
        LLM_MODEL=...
    """

    def __init__(self, base_url: str, api_key: str, model: str, timeout_s: float = LLM_TIMEOUT_S,
                 transport: httpx.BaseTransport | None = None):
        self.url = base_url.rstrip("/") + "/chat/completions"
        self.model = model
        self.timeout_s = timeout_s
        self._http = httpx.Client(headers={"Authorization": f"Bearer {api_key}"}, timeout=timeout_s,
                                  transport=transport)

    def complete(self, system: str, user: str) -> str:
        res = self._http.post(self.url, json={
            "model": self.model,
            "temperature": 0,
            "max_tokens": MAX_ANSWER_TOKENS,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        })
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"] or ""


def load_chat_client() -> ChatClient | None:
    key, model = os.getenv("LLM_API_KEY", ""), os.getenv("LLM_MODEL", "")
    if not key or not model:
        log.warning("LLM_API_KEY or LLM_MODEL is not set: Ask Compliance will leave answers to the backend's stand-in")
        return None
    return ChatClient(os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"), key, model)


# ---------------------------------------------------------------------------
# Building the request
# ---------------------------------------------------------------------------

def _source_label(p: Passage) -> str:
    return f"{p.source_title}, {p.section}" if p.section else p.source_title


def _is_neighbour(p: Passage) -> bool:
    return any(w.startswith("same section as") for w in p.why)


def select_passages(passages: list[Passage]) -> list[Passage]:
    """The passages to show the LLM, within the token budget.

    Passages retrieval ranked come first, best first. The other halves of
    split sections only fill the room left: a long neighbour must never push
    out a ranked passage, such as the fees schedule for a question about cost.
    """
    chosen: set[str] = set()
    used = 0
    for pass_neighbours in (False, True):
        for p in passages:
            if _is_neighbour(p) != pass_neighbours or p.id in chosen:
                continue
            cost = estimate_tokens(p.text) + 30
            if chosen and (len(chosen) >= MAX_PASSAGES or used + cost > CONTEXT_TOKEN_BUDGET):
                continue
            chosen.add(p.id)
            used += cost
    # Keep retrieval's order, which puts each section's pieces together.
    return [p for p in passages if p.id in chosen]


def build_prompt(question: str, language: str, passages: list[Passage], retrieval: Retrieval) -> tuple[str, str]:
    system = PROMPT_FILE.read_text(encoding="utf-8").replace("{language_name}", LANGUAGE_NAMES[language])
    blocks = []
    for n, p in enumerate(passages, start=1):
        where = f"{p.county.replace('_', ' ').title()} County" if p.jurisdiction_level == "county" else "National"
        blocks.append(f"[{n}] {_source_label(p)}\n({where}; last verified {p.last_verified_at or 'unknown'})\n{p.text}")
    notes = []
    if retrieval.county and retrieval.county_status == "covered":
        notes.append(f"The founder's business is in {retrieval.county.replace('_', ' ').title()} County.")
    user = "SOURCES\n\n" + "\n\n".join(blocks) + "\n\n" + ("\n".join(notes) + "\n\n" if notes else "")
    user += f"QUESTION\n{question.strip()}"
    return system, user


# ---------------------------------------------------------------------------
# Checking the reply
# ---------------------------------------------------------------------------

_MARKER = re.compile(r"\[(\d{1,2})\]")
_EXPERT = re.compile(r"^\s*EXPERT:\s*(yes|no)\s*$", re.I | re.M)
# Amounts, rates and counts: "4,000", "KSh 5 million", "1.5%", "30 days". Years
# and the citation markers themselves are left out.
_NUMBER = re.compile(r"(?<![\[\d])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\[\d.])\d+(?:\.\d+)?(?![\]\d])")


def _numbers(text: str) -> set[str]:
    out = set()
    for raw in _NUMBER.findall(text):
        value = raw.replace(",", "")
        if re.fullmatch(r"(19|20)\d\d", value):  # a year, usually part of a law's name
            continue
        out.add(value.rstrip("0").rstrip(".") if "." in value else value)
    return out


def unsupported_numbers(answer: str, cited: list[Passage]) -> set[str]:
    """Numbers in the answer that none of its cited passages contain."""
    source_numbers = set()
    for p in cited:
        source_numbers |= _numbers(p.text)
    return _numbers(_MARKER.sub(" ", answer)) - source_numbers


@dataclass
class ParsedReply:
    text: str                   # the answer, markers renumbered to match `citations`
    cited: list[Passage]        # every passage a marker points at
    citations: list[Citation]   # one per source and section, in order of first use
    not_found: bool
    wants_expert: bool


def parse_reply(reply: str, passages: list[Passage]) -> ParsedReply:
    expert = _EXPERT.search(reply)
    wants_expert = bool(expert and expert.group(1).lower() == "yes")
    text = _EXPERT.sub("", reply).strip()
    if not text or text.upper().startswith("NOT_FOUND"):
        return ParsedReply("", [], [], True, wants_expert)

    # Two pieces of one split section are one citation. Number citations in
    # order of first use, and drop markers that point at no passage.
    key_of = {n: (_source_label(p), p.url) for n, p in enumerate(passages, start=1)}
    keys: list[tuple[str, str]] = []
    cited_numbers: list[int] = []
    for m in _MARKER.finditer(text):
        n = int(m.group(1))
        if n in key_of:
            if n not in cited_numbers:
                cited_numbers.append(n)
            if key_of[n] not in keys:
                keys.append(key_of[n])
    number_of = {k: i for i, k in enumerate(keys, start=1)}

    def renumber(m: re.Match) -> str:
        n = int(m.group(1))
        return f"[{number_of[key_of[n]]}]" if n in key_of else ""

    text = _MARKER.sub(renumber, text)
    text = re.sub(r"(\[\d+\])(?:\1)+", r"\1", text)          # "[1][1]" -> "[1]"
    text = re.sub(r"[ \t]+([.,;:])", r"\1", re.sub(r"[ \t]{2,}", " ", text)).strip()

    first_passage = {}
    for n in cited_numbers:
        first_passage.setdefault(key_of[n], passages[n - 1])
    citations = [Citation(source=k[0], url=k[1], last_verified=first_passage[k].last_verified_at or None)
                 for k in keys]
    return ParsedReply(text, [passages[n - 1] for n in cited_numbers], citations, False, wants_expert)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _decline(kind: str, language: str, reason: str, **fmt) -> ComplianceAnswer:
    return ComplianceAnswer(MESSAGES[kind][language].format(**fmt), [], False, True, reason)


def answer_question(question: str, language: str | None, profile: dict | None,
                    retriever: Retriever | None, llm: ChatClient | None, today=None) -> ComplianceAnswer:
    language = language_of(language)
    if retriever is None:
        raise AnswerUnavailable("compliance index not loaded")

    retrieval = retriever.search(question, profile, k=MAX_PASSAGES, today=today)

    # Questions with nothing safe to say are answered without the LLM.
    if retrieval.county_status == "not_covered":
        county = retrieval.county.replace("_", " ").title()
        return _decline("county_not_covered", language, f"county {retrieval.county} not covered", county=county)
    if retrieval.county_status == "unknown":
        return _decline("county_unknown", language, "county question without a county")
    if not retrieval.passages or not retrieval.relevant:
        return _decline("not_found", language, f"nothing relevant (best similarity {retrieval.best_similarity})")

    if llm is None:
        raise AnswerUnavailable("LLM not configured")

    passages = select_passages(retrieval.passages)
    system, user = build_prompt(question, language, passages, retrieval)
    started = time.monotonic()
    try:
        reply = llm.complete(system, user)
    except Exception as e:  # timeouts, HTTP errors, malformed responses
        log.warning("Ask Compliance LLM call failed after %.1fs: %s", time.monotonic() - started, e)
        raise AnswerUnavailable(f"LLM call failed: {e}") from e

    parsed = parse_reply(reply, passages)
    if parsed.not_found:
        return _decline("not_found", language, "LLM found no answer in the passages")
    if not parsed.cited:
        # Uncited text cannot be checked against a source, so it is not shown.
        log.warning("Ask Compliance reply had no valid citations; not shown: %r", reply[:300])
        return _decline("not_found", language, "reply had no valid citations")

    missing = unsupported_numbers(parsed.text, parsed.cited)
    if missing:
        log.warning("Ask Compliance answer not shown, numbers not in its sources %s: %r",
                    sorted(missing), parsed.text[:300])
        return _decline("not_found", language, f"numbers not in sources: {sorted(missing)}")
    return ComplianceAnswer(
        answer=parsed.text,
        citations=parsed.citations,
        confident=True,
        suggest_expert=parsed.wants_expert,
        reason="answered",
    )