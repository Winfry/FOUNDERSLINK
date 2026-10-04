"""Build the Ask Compliance search index from data/compliance/.

Run from the repository root, offline, whenever the compliance data changes:

    python -m ai.compliance_rag.ingest

Then restart the AI service so it loads the new index.

What goes in (all under data/compliance/):

  sources.json           Every official source we may quote: an Act, regulation,
                         county Finance Act or regulator guidance page. Each has
                         a URL and the date a team member last checked it.
                         Optional "unit": Section, Regulation or Rule, when
                         detecting it from the text gets it wrong.
  national/items.json    Plain-language checklist items (same fields as the
  counties/<county>.json backend's compliance_items table), plus the county
  deals/<deal_type>.json or deal type they belong to.
  <file> in sources.json The downloaded copy of each source (.pdf, .html, .txt, .md).

Rules this script keeps (TEAM_DECISIONS D3, KENYA_AMENDMENTS section 5):

  - Nothing without an official URL and a last-verified date is indexed,
    because every answer must be able to cite one.
  - Every chunk carries the metadata the answer needs to cite it and the
    filters retrieval needs: regulator, national or county, which county,
    deal type and the review date.
  - Review dates are stored, not checked here. Retrieval hides anything past
    its review date at question time, so an item expires without a rebuild.
  - A source whose file changed since the last build is reported, because
    the law may have changed and someone must re-verify it.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

from ai.compliance_rag.chunking import (
    HEADER_RESERVE,
    MODEL_MAX_TOKENS,
    PAGE_BREAK,
    UNITS,
    chunk_legal_text,
    estimate_tokens,
)
from ai.embeddings.model import load_embedder

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("COMPLIANCE_DATA_DIR", REPO_ROOT / "data" / "compliance"))
INDEX_DIR = Path(os.getenv("COMPLIANCE_INDEX_DIR", REPO_ROOT / "ai" / "compliance_rag" / "index"))
COLLECTION = "compliance"
MANIFEST = INDEX_DIR / "manifest.json"

# A PDF page with less text than this is probably a scanned image (common
# with Kenya Gazette supplements) and needs OCR before it can be searched.
MIN_CHARS_PER_PAGE = 200

LEVELS = {"national", "county"}


def county_key(name: str | None) -> str | None:
    """One spelling per county, so "Uasin Gishu" (the backend), "uasin_gishu"
    (a file name) and "Murang'a" / "muranga" all match."""
    if not name:
        return None
    return re.sub(r"[\s_-]+", "_", name.strip().lower().replace("'", "").replace("’", "")) or None
DEMO_COUNTIES = {"nairobi", "mombasa", "kisumu", "machakos"}


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------

@dataclass
class Source:
    id: str
    title: str
    institution: str
    regulator: str            # short code used for filtering: KRA, BRS, ODPC, NSSF, SHA, county ...
    url: str
    last_verified_at: date
    next_review_at: date | None
    jurisdiction_level: str   # national | county
    county: str | None        # nairobi, mombasa ... when jurisdiction_level is county
    file: str | None          # path under data/compliance/, None for a URL-only source
    item_ids: list[str] = field(default_factory=list)
    deal_type: str | None = None
    finance_act_year: int | None = None
    language: str = "en"
    owner: str | None = None
    unit: str | None = None   # Section, Regulation or Rule; detected from the text when not set


@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict


class IngestError(Exception):
    pass


# ---------------------------------------------------------------------------
# Loading and validating the data
# ---------------------------------------------------------------------------

def _parse_date(value, field_name: str, record_id: str) -> date | None:
    if value in (None, ""):
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        raise IngestError(f"{record_id}: {field_name} must be YYYY-MM-DD, got {value!r}")


def _read_json(path: Path):
    if not path.exists() or path.stat().st_size == 0:
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_sources(problems: list[str]) -> dict[str, Source]:
    raw = _read_json(DATA_DIR / "sources.json")
    if raw is None:
        raise IngestError(f"{DATA_DIR / 'sources.json'} is missing or empty")

    sources: dict[str, Source] = {}
    for entry in raw.get("sources", raw if isinstance(raw, list) else []):
        sid = entry.get("id") or "<no id>"
        try:
            if not entry.get("url"):
                raise IngestError(f"{sid}: no official url, so it could never be cited")
            verified = _parse_date(entry.get("last_verified_at"), "last_verified_at", sid)
            if verified is None:
                raise IngestError(f"{sid}: never verified (no last_verified_at)")
            level = entry.get("jurisdiction_level", "national")
            if level not in LEVELS:
                raise IngestError(f"{sid}: jurisdiction_level must be national or county")
            county = county_key(entry.get("county"))
            if level == "county" and not county:
                raise IngestError(f"{sid}: a county source must name its county")
            if sid in sources:
                raise IngestError(f"{sid}: duplicate id")
            unit = entry.get("unit")
            if unit is not None and unit not in UNITS:
                raise IngestError(f"{sid}: unit must be one of {', '.join(UNITS)}")

            sources[sid] = Source(
                id=sid,
                title=entry["title"],
                institution=entry.get("institution", ""),
                regulator=entry.get("regulator", "").upper(),
                url=entry["url"],
                last_verified_at=verified,
                next_review_at=_parse_date(entry.get("next_review_at"), "next_review_at", sid),
                jurisdiction_level=level,
                county=county,
                file=entry.get("file"),
                item_ids=list(entry.get("item_ids", [])),
                deal_type=entry.get("deal_type"),
                finance_act_year=entry.get("finance_act_year"),
                language=entry.get("language", "en"),
                owner=entry.get("owner"),
                unit=unit,
            )
        except (IngestError, KeyError) as e:
            problems.append(f"SKIPPED source {e}")
    return sources


def load_items(problems: list[str]) -> list[dict]:
    """Checklist items from national/, counties/ and deals/.

    Each file holds a list of items, or {"items": [...]}. The county and
    deal type come from the file name when the item does not say.
    """
    items: list[dict] = []
    for folder, kind in (("national", None), ("counties", "county"), ("deals", "deal")):
        for path in sorted((DATA_DIR / folder).glob("*.json")):
            raw = _read_json(path)
            if raw is None:
                problems.append(f"EMPTY {path.relative_to(DATA_DIR)}")
                continue
            for item in raw.get("items", raw) if isinstance(raw, dict) else raw:
                item = dict(item)
                if kind == "county":
                    item.setdefault("jurisdiction_level", "county")
                    item.setdefault("county", path.stem)
                if kind == "deal":
                    item.setdefault("scope", "deal")
                    item.setdefault("deal_type", path.stem)
                item["_file"] = str(path.relative_to(DATA_DIR))
                items.append(item)
    return items


# ---------------------------------------------------------------------------
# Reading source files
# ---------------------------------------------------------------------------

class _TextOnly(HTMLParser):
    """Keeps the visible text of an HTML page, one block per line."""

    SKIP = {"script", "style", "nav", "header", "footer", "noscript"}
    BLOCK = {"p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "br", "section"}

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def read_text(path: Path, problems: list[str], source_id: str) -> str:
    """The text of a source file. PDF pages are separated by form feeds so
    the chunker can follow a section across pages and still cite the page."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader

        pages = []
        thin = 0
        for page in PdfReader(str(path)).pages:
            text = (page.extract_text() or "").replace(PAGE_BREAK, " ")
            if len(text.strip()) < MIN_CHARS_PER_PAGE:
                thin += 1
            pages.append(text)
        if pages and thin / len(pages) > 0.5:
            problems.append(f"WARN {source_id}: {thin} of {len(pages)} pages have almost no text; "
                            "probably scanned, needs OCR")
        return PAGE_BREAK.join(pages)
    if suffix in (".html", ".htm"):
        parser = _TextOnly()
        parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        return "".join(parser.parts)
    if suffix in (".txt", ".md"):
        return path.read_text(encoding="utf-8", errors="replace")
    raise IngestError(f"{source_id}: cannot read {suffix} files")


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ---------------------------------------------------------------------------
# Building chunks
# ---------------------------------------------------------------------------

def _date_int(d: date | None) -> int:
    # Chroma can only compare numbers, so dates are also stored as YYYYMMDD.
    # 99991231 means "no review date set".
    return int(d.strftime("%Y%m%d")) if d else 99991231


def base_metadata(src: Source) -> dict:
    """What every chunk from this source carries. Chroma metadata values must
    be str, int, float or bool, so None becomes "" and lists are joined."""
    return {
        "source_id": src.id,
        "source_title": src.title,
        "institution": src.institution,
        "regulator": src.regulator,
        "url": src.url,
        "jurisdiction_level": src.jurisdiction_level,
        "county": src.county or "",
        "deal_type": src.deal_type or "",
        "item_ids": ",".join(src.item_ids),
        "finance_act_year": src.finance_act_year or 0,
        "language": src.language,
        "last_verified_at": src.last_verified_at.isoformat(),
        "next_review_at": src.next_review_at.isoformat() if src.next_review_at else "",
        "next_review_int": _date_int(src.next_review_at),
    }


def item_chunk(item: dict, sources: dict[str, Source], problems: list[str]) -> Chunk | None:
    """One chunk per checklist item: the curated, plain-language explanation
    founders understand best. It cites the source the item points to."""
    iid = item.get("id", "<no id>")
    src = sources.get(item.get("source_id", ""))
    if src is None:
        # Items may give their own url and date instead of pointing to sources.json.
        verified = _parse_date(item.get("last_verified_at"), "last_verified_at", iid)
        if not item.get("source_url") or verified is None:
            problems.append(f"SKIPPED item {iid} ({item['_file']}): no verified official source")
            return None
        src = Source(
            id=f"item:{iid}", title=item.get("title", iid),
            institution=item.get("institution", ""), regulator=item.get("regulator", "").upper(),
            url=item["source_url"],
            last_verified_at=verified,
            next_review_at=_parse_date(item.get("next_review_at"), "next_review_at", iid),
            jurisdiction_level=item.get("jurisdiction_level", "national"),
            county=county_key(item.get("county")), file=None,
            deal_type=item.get("deal_type"), finance_act_year=item.get("finance_act_year"),
        )

    lines = [item.get("title", "")]
    for label, key in (("Why it matters", "why"), ("Who it applies to", "applies_to_text"),
                       ("Documents needed", "documents_needed"), ("How to do it", "how_to"),
                       ("Cost", "cost"), ("When", "recurrence"),
                       ("When to get a lawyer or accountant", "when_to_get_help")):
        if item.get(key):
            lines.append(f"{label}: {item[key]}")
    lines.append(f"Institution: {item.get('institution') or src.institution}")
    if src.county:
        lines.append(f"County: {src.county.replace('_', ' ').title()}")

    meta = base_metadata(src)
    meta.update({
        "doc_type": "item",
        "item_ids": iid,
        "title": item.get("title", iid),
        "scope": item.get("scope", "business"),
        "deal_type": item.get("deal_type") or meta["deal_type"],
        "jurisdiction_level": item.get("jurisdiction_level", meta["jurisdiction_level"]),
        "county": county_key(item.get("county")) or meta["county"],
        "is_demo": bool(item.get("is_demo", False)),
        "section": "",
        "page": 0,
    })
    return Chunk(id=f"item:{iid}", text="\n".join(lines), metadata=meta)


# The embedding model is shared with matching (ai/embeddings/model.py) and
# is used here as it is: these helpers add what compliance needs on top of
# it, without changing it. A stand-in in tests may provide the same methods.

def encode_passages(embedder, texts: list[str]):
    """Vectors for pieces stored in the index ("passage: " prefix for e5)."""
    own = getattr(embedder, "encode_passages", None)
    return own(texts) if own else embedder._encode(texts, "passage")


def encode_query(embedder, text: str):
    """The vector for a question searched against the index ("query: " prefix for e5)."""
    own = getattr(embedder, "encode_query", None)
    return own(text) if own else embedder._encode([text], "query")[0]


def _tokens(embedder):
    """The model's own token counter and input limit, or a cautious estimate."""
    model = getattr(embedder, "model", None)
    tokenizer = getattr(model, "tokenizer", None)

    def by_tokenizer(text: str) -> int:
        # verbose=False: counting a long section before it is split is expected,
        # so the "longer than the maximum sequence length" warning is noise.
        return len(tokenizer(text, add_special_tokens=False, verbose=False)["input_ids"])  # type: ignore[misc]

    count = getattr(embedder, "count_tokens", None) or (by_tokenizer if tokenizer is not None else estimate_tokens)
    limit = getattr(embedder, "max_tokens", None) or getattr(model, "max_seq_length", None) or MODEL_MAX_TOKENS
    return count, limit


def source_chunks(src: Source, problems: list[str], embedder=None) -> tuple[list[Chunk], str | None]:
    """The legal text itself, split along its sections."""
    if not src.file:
        return [], None
    path = DATA_DIR / src.file
    if not path.exists():
        problems.append(f"SKIPPED source {src.id}: file {src.file} not found")
        return [], None

    count, limit = _tokens(embedder)
    chunks: list[Chunk] = []
    pieces = chunk_legal_text(
        read_text(path, problems, src.id),
        unit=src.unit,
        count_tokens=count,
        max_tokens=limit - HEADER_RESERVE,
    )
    for n, piece in enumerate(pieces):
        meta = base_metadata(src)
        meta.update({
            "doc_type": "source",
            "title": src.title,
            "scope": "deal" if src.deal_type else "business",
            "is_demo": False,
            "section": piece.section or "",
            "page": piece.page or 0,
        })
        # Put the title and section in front so the embedding knows which
        # Act a bare clause like "(2) The Commissioner may..." comes from.
        header = src.title + (f", {piece.section}" if piece.section else "")
        chunks.append(Chunk(id=f"{src.id}:{n}", text=f"{header}\n{piece.text}", metadata=meta))
    if not chunks:
        problems.append(f"WARN {src.id}: no text extracted from {src.file}")
    return chunks, file_hash(path)


# ---------------------------------------------------------------------------
# Writing the index
# ---------------------------------------------------------------------------

def write_index(chunks: list[Chunk], embedder) -> None:
    import chromadb

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(INDEX_DIR))
    # Rebuild from scratch so removed sources disappear from answers.
    try:
        client.delete_collection(COLLECTION)
    except Exception:
        pass
    collection = client.create_collection(COLLECTION, metadata={"hnsw:space": "cosine"})

    batch = 256
    for i in range(0, len(chunks), batch):
        part = chunks[i:i + batch]
        vectors = encode_passages(embedder, [c.text for c in part])
        collection.add(
            ids=[c.id for c in part],
            documents=[c.text for c in part],
            metadatas=[c.metadata for c in part],
            embeddings=[list(map(float, v)) for v in vectors],
        )


def ingest() -> int:
    problems: list[str] = []
    sources = load_sources(problems)
    items = load_items(problems)

    # Loaded first: chunking counts pieces in this model's own tokens.
    embedder = load_embedder()
    if embedder is None:
        raise IngestError("EMBEDDING_MODEL is 'none'; the index needs an embedding model")

    chunks: list[Chunk] = []
    hashes: dict[str, str] = {}
    for item in items:
        c = item_chunk(item, sources, problems)
        if c:
            chunks.append(c)
    for src in sources.values():
        if src.jurisdiction_level == "county" and src.county not in DEMO_COUNTIES:
            problems.append(f"WARN {src.id}: county {src.county} is outside the demo counties")
        new, h = source_chunks(src, problems, embedder)
        chunks.extend(new)
        if h:
            hashes[src.id] = h

    ids = [c.id for c in chunks]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        raise IngestError(f"duplicate chunk ids: {sorted(dupes)}")
    if not chunks:
        for p in problems:
            print(p)
        raise IngestError("nothing to index: every source and item above was skipped. "
                          "Verify them and set last_verified_at in data/compliance/")

    # Sources whose file changed since the last build must be re-verified.
    previous = (_read_json(MANIFEST) or {}).get("source_hashes", {})
    for sid, h in hashes.items():
        if sid in previous and previous[sid] != h:
            problems.append(f"CHANGED {sid}: the file differs from the last build; re-verify it")

    # Anything longer than the model reads is cut off without warning, and
    # the cut-off text can never be found. Report it so the source can be fixed.
    count, limit = _tokens(embedder)
    for c in chunks:
        used = count(f"passage: {c.text}") + 2  # e5 prefix and the two special tokens
        if used > limit:
            problems.append(f"TOO LONG {c.id}: {used} tokens, the model reads {limit}; the end will not be searchable")

    write_index(chunks, embedder)

    # retrieve.py must embed questions with the same model, so record it.
    MANIFEST.write_text(json.dumps({
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "embedding_model": embedder.model_name,
        "chunks": len(chunks),
        "items": sum(1 for c in chunks if c.metadata["doc_type"] == "item"),
        "sources": sorted(sources),
        "source_hashes": hashes,
        "problems": problems,
    }, indent=2), encoding="utf-8")

    for p in problems:
        print(p)
    print(f"Indexed {len(chunks)} chunks from {len(sources)} sources and "
          f"{sum(1 for c in chunks if c.metadata['doc_type'] == 'item')} items into {INDEX_DIR}")
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        sys.exit(ingest())
    except IngestError as e:
        print(f"Ingest failed: {e}", file=sys.stderr)
        sys.exit(1)
