"""Split Kenyan legal and regulatory text into pieces that can be cited.

Kenyan Acts (Kenya Law, Kenya Gazette supplements) are laid out as:

    PART III—REGISTRATION OF DATA CONTROLLERS AND DATA PROCESSORS
    18. Registration of data controllers and data processors
    (1) No person shall act as a data controller or data processor unless...
    (2) ...
    FIRST SCHEDULE

An answer has to say "Data Protection Act, 2019, section 18", so the split
follows sections, never a fixed number of characters across them:

  - Each section becomes one chunk, labelled "Section 18 (Registration of...)".
  - Regulations and rules number their parts the same way but call them
    regulations and rules, so a citation says "Regulation 5", not "Section 5".
  - A section too long for the embedding model is split at its subsections
    "(1)", "(2)", then at paragraphs, then at sentences. Every piece keeps
    the section label.
  - Kenya Law PDFs print section headings in the margin. Extraction puts
    them on the line before "18. (1) ...", so they are moved to the section
    they name instead of being left at the end of the one before.
  - An interpretation section is split one definition per chunk, labelled
    'Section 2 (Interpretation), definition of "personal data"'.
  - A section of a Finance Act that changes another law is labelled with
    the law it changes: "Section 2 (amends section 2 of the Income Tax Act)".
  - Schedules are labelled by schedule.
  - Text with no sections (regulator guidance pages, Markdown notes) is split
    at headings and paragraphs instead.

Both layouts in use are handled: Kenya Law's revised editions (a "Contents"
list with dot leaders, "Part I –", a running header on every page) and
original Kenya Gazette supplements (margin notes, "PART I-", OCR noise).

Pages are separated by form feeds ("\\f") in the text passed in, so each
chunk can also say which page it starts on.

Size is counted in the embedding model's own tokens when ingest passes its
tokenizer (count_tokens), and estimated cautiously from characters when not.
"""

from __future__ import annotations

import re
import math
from dataclasses import dataclass
from typing import Callable

# multilingual-e5-small reads at most 512 tokens and silently drops the rest.
# Out of those 512, ingest needs room for "passage: ", the two special tokens
# and a title line such as "Data Protection Act, 2019, Section 18 (...)".
MODEL_MAX_TOKENS = 512
HEADER_RESERVE = 72
MAX_TOKENS = MODEL_MAX_TOKENS - HEADER_RESERVE
# A piece smaller than this at the end of a section is joined to the one before.
MIN_TOKENS = 50

# Without the real tokenizer, assume 3 characters a token. Legal English is
# usually nearer 4 with the XLM-R tokenizer e5 uses, and Swahili nearer 3, so
# this errs towards pieces that are a little small rather than cut off.
CHARS_PER_TOKEN_ESTIMATE = 3


def estimate_tokens(text: str) -> int:
    return math.ceil(len(text) / CHARS_PER_TOKEN_ESTIMATE)

PAGE_BREAK = "\f"

# "PART III—REGISTRATION ..." (Kenya Law uses an em dash; PDFs vary)
# Kenya Law revised editions write "Part I – PRELIMINARY". A sentence that
# starts "Part IV of this Act..." has no dash, so it is not a heading.
# OCR often reads the I of a roman numeral as l or 1: "PART Ill-VALUE ADDED TAX".
_PART = re.compile(r"^(?:PART\s+([IVXLCl1]+)\b\s*[—–\-:.]?\s*(.*)|Part\s+([IVXLC]+)\s*[—–-]\s*(.*))$")
# Acts number sections, regulations number regulations, rules number rules.
UNITS = ("Section", "Regulation", "Rule", "Paragraph")
_NUMBERED_LABEL = re.compile(rf"^({'|'.join(UNITS)}) \d")
_ARRANGEMENT = re.compile(r"^(?:ARRANGEMENT OF (SECTIONS|REGULATIONS|RULES|PARAGRAPHS)\b|Contents$|CONTENTS?$)", re.I)
# A contents entry: "18. Registration of data controllers ........ 9"
_DOT_LEADER = re.compile(r"(?:\.\s?){6,}\s*\d*\s*$")
# Where the instrument itself starts, after its contents list.
_INSTRUMENT_START = re.compile(r"^(AN ACT|IN EXERCISE)\b", re.I)

# "18. Registration of ..." or "23A. Exemptions". Number, dot, then a capital,
# an opening bracket or a quote.
_SECTION = re.compile(r"^(\d{1,3}[A-Z]{0,2})\.\s+(?=[A-Z(“\"'\[])(.*)$")
# Sections run 1, 2, 3 ... and a revised edition keeps "[Repealed]" ones, so
# a real next section is never far ahead. A list of tariff items numbered 158,
# 159 inside section 32 of a Finance Act is far ahead, so it is not a section.
_MAX_SECTION_JUMP = 5
# "FIRST SCHEDULE", "SCHEDULE", "THE SECOND SCHEDULE"
_SCHEDULE = re.compile(r"^(?:THE\s+)?((?:[A-Z]+\s+)?SCHEDULE)\b(.*)$")
# Markdown or plain headings in guidance documents
_HEADING = re.compile(r"^(#{1,4})\s+(.+)$")
# "(1)", "(2A)"
_SUBSECTION = re.compile(r"(?=^\(\d{1,3}[A-Z]?\)\s)", re.MULTILINE)

# Lines that are page furniture, not law.
_NOISE = [
    re.compile(r"^\s*\d{1,4}\s*$"),                                  # page numbers
    re.compile(r"^\s*\[?Rev\.\s*\d{4}\]?.*$", re.IGNORECASE),        # Kenya Law revision headers
    re.compile(r"^\s*Kenya Gazette Supplement.*$", re.IGNORECASE),
    re.compile(r"^\s*Published by the National Council for Law Reporting.*$", re.IGNORECASE),
    re.compile(r"^\s*www\.kenyalaw\.org.*$", re.IGNORECASE),
    re.compile(r"^\s*CAP\.\s*\d+[A-Z]?\s*$", re.IGNORECASE),
]

# Kenya Law PDFs set "fi", "fl" ... as single ligature characters, so
# "identiﬁable" would never match a question about "identifiable".
_LIGATURES = str.maketrans({"\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi",
                            "\ufb04": "ffl", "\ufb05": "st", "\ufb06": "st"})


def _is_garbage(line: str) -> bool:
    """OCR debris from Gazette crests and stamps: mostly not letters."""
    if len(line) < 8:
        return False
    letters = sum(ch.isalpha() for ch in line)
    return letters / len(line) < 0.4


@dataclass
class LegalChunk:
    section: str | None   # "Section 18 (Registration of ...)", "First Schedule", a heading, or None
    text: str
    page: int | None      # page the chunk starts on, when the text had page breaks


# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------

def clean(text: str) -> str:
    """Undo the damage PDF extraction does, keeping one line per line."""
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ").translate(_LIGATURES)
    text = text.replace("\u00ad", "-")  # soft hyphen, common in OCR output
    # "regis-\ntration" -> "registration". Only before a lowercase letter:
    # "respectively-\nSECOND SCHEDULE" is a dash and a new line, not one word.
    text = re.sub(r"(\w)-\n([a-z])", r"\1\2", text)
    lines = []
    for line in text.split("\n"):
        if (any(p.match(line) for p in _NOISE) or _DOT_LEADER.search(line) or _is_garbage(line.strip())) \
                and PAGE_BREAK not in line:
            continue
        lines.append(re.sub(r"[ \t]+", " ", line).strip())
    text = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


_EDGE_LINES = 4


def _strip_running_heads(pages: list[list[str]]) -> list[list[str]]:
    """Remove page headers and footers that repeat on many pages.

    "Data Protection Act (Cap. 411C) Kenya" on every Kenya Law page, or
    "No.19 / Finance / 2026" on a Gazette supplement, would otherwise be
    stitched into the middle of whichever section crosses the page.
    """
    if len(pages) < 4:
        return pages
    norm = lambda l: re.sub(r"\s+", " ", l).strip().lower()
    counts: dict[str, int] = {}
    for page in pages:
        filled = [l for l in page if l.strip()]
        edges = {norm(l) for l in filled[:_EDGE_LINES] + filled[-_EDGE_LINES:] if len(l) <= 120}
        for e in edges:
            counts[e] = counts.get(e, 0) + 1
    threshold = max(3, len(pages) // 4)
    repeated = {e for e, n in counts.items() if n >= threshold and e}
    if not repeated:
        return pages
    out = []
    for page in pages:
        idx = [i for i, l in enumerate(page) if l.strip()]
        edge = set(idx[:_EDGE_LINES] + idx[-_EDGE_LINES:])
        out.append([l for i, l in enumerate(page) if not (i in edge and norm(l) in repeated)])
    return out


# ---------------------------------------------------------------------------
# Finding the structure
# ---------------------------------------------------------------------------

def _section_number(label: str) -> tuple[int, str]:
    m = re.match(r"(\d+)([A-Z]*)", label)
    return (int(m.group(1)), m.group(2)) if m else (0, "")


def _short_title(rest: str) -> str:
    """The heading printed after the number, if any.

    "Registration of traders"                      -> "Registration of traders"
    "Registration of traders.—(1) No person ..."   -> "Registration of traders"
    "Short title.—This Act may be cited as ..."    -> "Short title"
    "(1) No person shall ..."                      -> "" (heading is in the margin)
    "This Act may be cited as ..."                 -> "" (that is the law, not a heading)
    """
    if rest.startswith("("):
        return ""
    # Older style: the heading ends with ".—" and the law follows on the same line.
    m = re.match(r"^([^.—–]{1,90}?)\.\s*[—–]", rest)
    if m and not _VERB.search(m.group(1)):
        return m.group(1).strip()
    raw = re.split(r"\s*[.—–-]*\s*\(\d", rest, maxsplit=1)[0].strip()
    title = raw.rstrip(".—–-:").strip()
    # "In this Act, unless the context otherwise requires—" opens a list; it is not a heading.
    if raw.endswith(("—", "–", ":")) or len(title) > _MAX_NOTE_LINE or _VERB.search(title):
        return ""
    return title


def _amendment_title(text: str) -> str:
    """What a Finance Act section changes, from its opening words.

    "2. Section 2 of the Income Tax Act is amended in subsection (1)-"
        -> "amends section 2 of the Income Tax Act"
    "4. The Income Tax Act is amended by inserting ..."  -> "amends the Income Tax Act"
    "21. Head B of the Third Schedule to the Income Tax Act is amended"
        -> "amends Head B of the Third Schedule to the Income Tax Act"
    """
    head = re.sub(r"\s+", " ", text[:300])
    m = re.match(r"^\d{1,3}[A-Z]{0,2}\.\s+(.{3,160}?)\s+(?:\(Cap\. ?[\w.]+\)\s+)?is\s+(?:further\s+)?(amended|repealed)\b",
                 head)
    # The target names a law ("...Act", or a typo such as "...Income Tax is amended").
    if not m or not re.search(r"\b(Act|Tax|Regulations|Rules)\b", m.group(1)):
        return ""
    target = m.group(1).strip()
    if target.startswith(("The ", "Section ", "Paragraph ")):
        target = target[0].lower() + target[1:]
    verb = "amends" if m.group(2) == "amended" else "repeals"
    return f"{verb} {target}"[:110]


# A margin note is short, starts with a capital and ends with a full stop:
# "Registration of data controllers." It may wrap over a few lines.
_MAX_NOTE_LINE = 80
_MAX_NOTE_LINES = 3
_VERB = re.compile(
    r"\b(shall|may|must|is|are|was|were|will|has|have|does|do|means|includes|requires|provides|applies)\b",
    re.IGNORECASE,
)


def _take_margin_note(current: list[tuple[int, str]]) -> str:
    """Remove and return the margin note at the end of the previous block.

    Kenya Law PDFs print each section's heading in the margin, and text
    extraction puts it on its own line just before "18. (1) ...", which
    would otherwise leave it at the bottom of section 17. Only lines that
    start a new sentence count, so the end of a wrapped sentence such as
    "...registered with the\nData Commissioner." is left alone.
    """
    idx = [i for i, (_, l) in enumerate(current) if l.strip()]
    for size in range(1, _MAX_NOTE_LINES + 1):
        if len(idx) < size:
            break
        picked = idx[-size:]
        lines = [current[i][1] for i in picked]
        if any(len(l) > _MAX_NOTE_LINE or l.startswith("(") or _SECTION.match(l) for l in lines):
            break
        # A heading names a topic; a sentence that "shall" do something is law.
        if _VERB.search(" ".join(lines)):
            break
        if not lines[0][:1].isupper() or not lines[-1].endswith("."):
            continue
        # Nothing but full stops inside a one-line note: "Short title."
        if any(l.endswith((".", ";", ":")) for l in lines[:-1]):
            continue
        before = current[idx[-size - 1]][1] if len(idx) > size else ""
        if before and not before.rstrip().endswith((".", ";", ":", "—", "–", "-")) and not before.isupper():
            continue
        for i in reversed(picked):
            del current[i]
        return " ".join(lines).rstrip(".").strip()[:90]
    return ""


def detect_unit(lines: list[tuple[int, str]]) -> str:
    """What the numbered parts are called: Section, Regulation or Rule.

    Read from the contents heading ("ARRANGEMENT OF REGULATIONS"), the
    enacting words ("...makes the following Regulations—") or the title
    ("...REGULATIONS, 2021"), all near the top of the document.
    """
    head = [l for _, l in lines[:80] if l]
    for l in head:
        m = _ARRANGEMENT.match(l)
        if m and m.group(1):  # "Contents" alone does not say which
            return {"SECTIONS": "Section", "REGULATIONS": "Regulation",
                    "RULES": "Rule", "PARAGRAPHS": "Paragraph"}[m.group(1).upper()]
    joined = "\n".join(head)
    if re.search(r"\bmakes? the following Regulations\b|^THE .*REGULATIONS,? \d{4}\s*$", joined, re.M | re.I):
        return "Regulation"
    if re.search(r"\bmakes? the following Rules\b|^THE .*RULES,? \d{4}\s*$", joined, re.M | re.I):
        return "Rule"
    # Revised editions drop the enacting words, but the text still says
    # "these Regulations" where an Act says "this Act".
    body = "\n".join(l for _, l in lines)
    act = len(re.findall(r"\bthis Act\b", body))
    for word, unit in (("Regulations", "Regulation"), ("Rules", "Rule")):
        if len(re.findall(rf"\b[Tt]hese {word}\b", body)) > max(2, act):
            return unit
    return "Section"


def _blocks(lines: list[tuple[int, str]], unit: str = "Section") -> list[tuple[str | None, list[tuple[int, str]]]]:
    """Group lines under the section, schedule or heading they belong to."""
    blocks: list[tuple[str | None, list[tuple[int, str]]]] = []
    label: str | None = None
    current: list[tuple[int, str]] = []
    part: str | None = None
    last_number = (0, "")
    in_schedule = False
    found_sections = False

    def flush():
        if any(t for _, t in current):
            blocks.append((label, list(current)))
        current.clear()

    for i, (page, line) in enumerate(lines):
        m_part = _PART.match(line)
        # "FIRST SCHEDULE [s. 15]": judge the case of the words before the bracket.
        words = line.split("[")[0].strip()
        m_sched = _SCHEDULE.match(words) if words and (words.isupper() or words.startswith("THE ")) else None
        m_sec = _SECTION.match(line)
        m_head = _HEADING.match(line)

        if m_part:
            part = "Part " + (m_part.group(1) or m_part.group(3)).replace("l", "I").replace("1", "I")
            continue  # the part name is context, not content
        if m_sec and in_schedule and _section_number(m_sec.group(1)) == (last_number[0] + 1, ""):
            # A heading such as "THIRD SCHEDULE" quoted inside an amendment is
            # not the start of the real schedules if the next section follows.
            in_schedule = False
        if m_sched:
            flush()
            in_schedule = True
            label = m_sched.group(1).title()
        elif m_sec and not in_schedule:
            number = _section_number(m_sec.group(1))
            # Numbered lists inside a section ("1. The applicant shall...")
            # restart at 1. A real new section never goes backwards.
            if last_number < number and number[0] <= last_number[0] + _MAX_SECTION_JUMP:
                # The first sentence often wraps; read on, but not into the next section.
                following = []
                for _, nxt in lines[i + 1:i + 4]:
                    if _SECTION.match(nxt) or _PART.match(nxt):
                        break
                    following.append(nxt)
                opening = " ".join([line] + following)
                title = (_amendment_title(opening)
                         or _short_title(m_sec.group(2))
                         or _take_margin_note(current)
                         or ("Short title" if re.search(r"^\S+\s+(This Act|These Regulations|These Rules) may be cited", opening) else ""))
                flush()
                last_number = number
                found_sections = True
                label = f"{unit} {m_sec.group(1)}" + (f" ({title})" if title else "")
                if part:
                    label += f", {part}"
        elif m_head and not found_sections:
            flush()
            label = m_head.group(2).strip()
            line = m_head.group(2).strip()
        current.append((page, line))
    flush()
    return blocks


# ---------------------------------------------------------------------------
# Definitions
# ---------------------------------------------------------------------------

# “personal data” means ...   /  "trader" includes ...   /  ''Commissioner'' has the meaning
_DEFINITION = re.compile(
    r"""^(?:\(\w+\)\s*)?[“"'‘]{1,2}([^”"'’\n]{1,80})[”"'’]{1,2}\s*(?:,|\s)\s*"""
    r"(?:means|includes?|has the (?:same )?meaning|shall (?:mean|include)|refers to|is)\b",
    re.MULTILINE,
)
# Below this many definitions, a section is treated like any other.
_MIN_DEFINITIONS = 3


# Only an interpretation section is split by definition. Other sections that
# define a word or two in passing (an exemption that defines "turnover") stay whole.
_INTERPRETATION = re.compile(r"\b(interpretation|definitions)\b|unless the context otherwise requires", re.I)


def _split_definitions(body: str) -> list[tuple[str | None, str]] | None:
    """Split an interpretation section into one piece per defined term.

    Questions like "what counts as personal data?" match one definition far
    better than a block of thirty. Returns None when the text is not a list
    of definitions.
    """
    starts = list(_DEFINITION.finditer(body))
    if len(starts) < _MIN_DEFINITIONS:
        return None
    pieces: list[tuple[str | None, str]] = []
    intro = body[: starts[0].start()].strip()
    if intro:
        pieces.append((None, intro))
    for m, nxt in zip(starts, starts[1:] + [None]):
        text = body[m.start(): nxt.start() if nxt else len(body)].strip()
        pieces.append((m.group(1).strip(), text))
    return pieces


# ---------------------------------------------------------------------------
# Splitting to size
# ---------------------------------------------------------------------------

@dataclass
class _Budget:
    count: Callable[[str], int]
    max_tokens: int
    min_tokens: int

    def fits(self, text: str) -> bool:
        return self.count(text) <= self.max_tokens


def _split_long(text: str, budget: _Budget) -> list[str]:
    """Split one section's text to the token budget, at the biggest boundary that works."""
    if budget.fits(text):
        return [text]
    for splitter in (
        lambda t: _SUBSECTION.split(t),               # (1), (2) ...
        lambda t: re.split(r"\n\s*\n", t),            # paragraphs
        lambda t: re.split(r"(?<=[.;:])\s+(?=[A-Z(])", t),  # sentences and clauses
    ):
        parts = [p.strip() for p in splitter(text) if p.strip()]
        if len(parts) > 1:
            return _pack(parts, budget)
    # One enormous sentence: cut on words.
    words, out, buf = text.split(), [], ""
    for w in words:
        candidate = f"{buf} {w}".strip()
        if buf and not budget.fits(candidate):
            out.append(buf)
            buf = w
        else:
            buf = candidate
    return out + ([buf] if buf else [])


def _pack(parts: list[str], budget: _Budget) -> list[str]:
    """Join neighbouring parts up to the budget; split any part that is too big."""
    out: list[str] = []
    buf = ""
    for part in parts:
        for piece in [part] if budget.fits(part) else _split_long(part, budget):
            joined = f"{buf}\n{piece}" if buf else piece
            if buf and not budget.fits(joined):
                out.append(buf)
                buf = piece
            else:
                buf = joined
    if buf:
        # Don't leave a scrap at the end of a section, if the one before has room.
        if out and budget.count(buf) < budget.min_tokens and budget.fits(f"{out[-1]}\n{buf}"):
            out[-1] = f"{out[-1]}\n{buf}"
        else:
            out.append(buf)
    return out


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _skip_arrangement(lines: list[tuple[int, str]], contents_pages: set[int] = frozenset()) -> list[tuple[int, str]]:
    """Drop the cover and contents list at the start of an Act or regulations.

    "ARRANGEMENT OF SECTIONS" (or REGULATIONS, RULES, or Kenya Law's
    "Contents") lists every numbered part ("1. Short title", "2.
    Interpretation" ...) and would otherwise be read as the parts themselves.
    Anything before the list is a cover page or licence text.

    The instrument proper starts on the first page after the contents pages,
    which keeps the publication, assent and commencement lines printed above
    the long title. Without page breaks it starts at "AN ACT of Parliament
    to ..." or, for regulations, "IN EXERCISE of the powers ...".
    """
    start = next((i for i, (_, l) in enumerate(lines) if _ARRANGEMENT.match(l)), None)
    if start is None:
        return lines
    start_page = lines[start][0]
    end = None
    if start_page in contents_pages:
        end = next((i for i, (p, _) in enumerate(lines) if p > start_page and p not in contents_pages), None)
    if end is None:
        marker = next((i for i, (_, l) in enumerate(lines[start:], start) if _INSTRUMENT_START.match(l)), None)
        if marker is not None:
            marker_page = lines[marker][0]
            # Keep the rest of the page the long title is on, if the
            # contents list ended on an earlier page.
            end = next(i for i, (p, _) in enumerate(lines) if p == marker_page) if marker_page > start_page else marker
    if end is None:
        return lines
    return lines[end:]


def chunk_legal_text(
    text: str,
    unit: str | None = None,
    count_tokens: Callable[[str], int] | None = None,
    max_tokens: int = MAX_TOKENS,
) -> list[LegalChunk]:
    """Split a whole document (pages separated by "\\f") into cited chunks.

    unit: "Section", "Regulation" or "Rule". Detected from the text if not given.
    count_tokens: the embedding model's tokenizer. Estimated from characters if not given.
    max_tokens: the most a piece may hold, leaving room for the title line ingest adds.
    """
    if unit is not None and unit not in UNITS:
        raise ValueError(f"unit must be one of {UNITS}, got {unit!r}")
    budget = _Budget(count_tokens or estimate_tokens, max_tokens, MIN_TOKENS)
    has_pages = PAGE_BREAK in text
    raw_pages = text.split(PAGE_BREAK)
    # Pages of a contents list, recognised before cleaning removes the entries.
    contents_pages = {n for n, page in enumerate(raw_pages, start=1)
                      if sum(1 for l in page.split("\n") if _DOT_LEADER.search(l)) >= 3}
    pages = _strip_running_heads([clean(page).split("\n") for page in raw_pages])
    lines = [(n, line) for n, page in enumerate(pages, start=1) for line in page]
    unit = unit or detect_unit(lines)
    lines = _skip_arrangement(lines, contents_pages)

    blocks = _blocks(lines, unit)
    # The text before section 1 says what the instrument is for (an Act's
    # long title) or which power it is made under (regulations). Worth keeping.
    if blocks and blocks[0][0] is None:
        first = [l for _, l in blocks[0][1]]
        if any(re.match(r"^AN ACT\b", l, re.I) for l in first):
            blocks[0] = ("Long title", blocks[0][1])
        elif any(re.match(r"^IN EXERCISE\b", l, re.I) for l in first):
            blocks[0] = ("Enabling power", blocks[0][1])
        elif len(blocks) > 1 and blocks[1][0] and _NUMBERED_LABEL.match(blocks[1][0]):
            # Revised regulations keep the title and dates but not the enacting words.
            blocks[0] = ("Title and commencement", blocks[0][1])

    chunks: list[LegalChunk] = []
    for label, block in blocks:
        # Track where each piece starts so it can cite its page.
        body = "\n".join(t for _, t in block).strip()
        offsets, pos = [], 0
        for page, t in block:
            offsets.append((pos, page))
            pos += len(t) + 1

        is_interpretation = bool(label and _NUMBERED_LABEL.match(label)
                                 and (_INTERPRETATION.search(label) or _INTERPRETATION.search(body[:300])))
        definitions = _split_definitions(body) if is_interpretation else None
        if definitions:
            # Each term keeps the opening words ("In this Act, unless the
            # context otherwise requires—") so it reads as a definition.
            intro = definitions[0][1] if definitions[0][0] is None else ""
            parts = [(f'{label}, definition of "{term}"', text if not intro else f"{intro}\n{text}")
                     for term, text in definitions if term is not None]
        else:
            parts = [(label, body)]

        search_from = 0
        for part_label, part_text in parts:
            for piece in _split_long(part_text, budget):
                probe = piece[len(intro) + 1:] if definitions and intro and piece.startswith(intro) else piece
                probe = probe[:40]
                start = body.find(probe, search_from)
                if start < 0:
                    start = search_from
                search_from = start + 1
                page = next((p for off, p in reversed(offsets) if off <= start), block[0][0])
                chunks.append(LegalChunk(section=part_label, text=piece, page=page if has_pages else None))
    return chunks
