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
  - A section too long for the embedding model is split at its subsections
    "(1)", "(2)", then at paragraphs, then at sentences. Every piece keeps
    the section label.
  - Kenya Law PDFs print section headings in the margin. Extraction puts
    them on the line before "18. (1) ...", so they are moved to the section
    they name instead of being left at the end of the one before.
  - An interpretation section is split one definition per chunk, labelled
    'Section 2 (Interpretation), definition of "personal data"'.
  - Schedules are labelled by schedule.
  - Text with no sections (regulator guidance pages, Markdown notes) is split
    at headings and paragraphs instead.

Pages are separated by form feeds ("\\f") in the text passed in, so each
chunk can also say which page it starts on.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# multilingual-e5-small reads at most 512 tokens. Legal English runs at about
# 4 characters a token, and the ingest step adds a title line, so stay well
# under: 1,400 characters is roughly 350 tokens.
MAX_CHARS = 1400
# Pieces shorter than this are joined to the next piece of the same section.
MIN_CHARS = 200

PAGE_BREAK = "\f"

# "PART III—REGISTRATION ..." (Kenya Law uses an em dash; PDFs vary)
_PART = re.compile(r"^PART\s+([IVXLC]+)\b\s*[—–\-:.]?\s*(.*)$")
# "18. Registration of ..." or "23A. Exemptions". Number, dot, then a capital,
# an opening bracket or a quote.
_SECTION = re.compile(r"^(\d{1,3}[A-Z]{0,2})\.\s+(?=[A-Z(“\"'])(.*)$")
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
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace(" ", " ")
    # "regis-\ntration" -> "registration"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    lines = []
    for line in text.split("\n"):
        if any(p.match(line) for p in _NOISE) and PAGE_BREAK not in line:
            continue
        lines.append(re.sub(r"[ \t]+", " ", line).strip())
    text = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


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


def _blocks(lines: list[tuple[int, str]]) -> list[tuple[str | None, list[tuple[int, str]]]]:
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

    for page, line in lines:
        m_part = _PART.match(line)
        m_sched = _SCHEDULE.match(line) if line.isupper() or line.startswith("THE ") else None
        m_sec = _SECTION.match(line)
        m_head = _HEADING.match(line)

        if m_part:
            part = f"Part {m_part.group(1)}"
            continue  # the part name is context, not content
        if m_sched:
            flush()
            in_schedule = True
            label = m_sched.group(1).title()
        elif m_sec and not in_schedule:
            number = _section_number(m_sec.group(1))
            # Numbered lists inside a section ("1. The applicant shall...")
            # restart at 1. A real new section never goes backwards.
            if number > last_number:
                title = _short_title(m_sec.group(2)) or _take_margin_note(current)
                flush()
                last_number = number
                found_sections = True
                label = f"Section {m_sec.group(1)}" + (f" ({title})" if title else "")
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
    r"(?:means|includes|has the (?:same )?meaning|shall (?:mean|include)|refers to|is)\b",
    re.MULTILINE,
)
# Below this many definitions, a section is treated like any other.
_MIN_DEFINITIONS = 3


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

def _split_long(text: str) -> list[str]:
    """Split one section's text to MAX_CHARS, at the biggest boundary that works."""
    if len(text) <= MAX_CHARS:
        return [text]
    for splitter in (
        lambda t: _SUBSECTION.split(t),               # (1), (2) ...
        lambda t: re.split(r"\n\s*\n", t),            # paragraphs
        lambda t: re.split(r"(?<=[.;:])\s+(?=[A-Z(])", t),  # sentences and clauses
    ):
        parts = [p.strip() for p in splitter(text) if p.strip()]
        if len(parts) > 1:
            return _pack(parts)
    # One enormous sentence: cut on words.
    words, out, buf = text.split(), [], ""
    for w in words:
        if len(buf) + len(w) + 1 > MAX_CHARS and buf:
            out.append(buf)
            buf = w
        else:
            buf = f"{buf} {w}".strip()
    return out + ([buf] if buf else [])


def _pack(parts: list[str]) -> list[str]:
    """Join neighbouring parts up to MAX_CHARS; split any part that is too big."""
    out: list[str] = []
    buf = ""
    for part in parts:
        for piece in _split_long(part) if len(part) > MAX_CHARS else [part]:
            if buf and len(buf) + len(piece) + 1 > MAX_CHARS:
                out.append(buf)
                buf = piece
            else:
                buf = f"{buf}\n{piece}" if buf else piece
    if buf:
        # Don't leave a scrap at the end of a section.
        if out and len(buf) < MIN_CHARS and len(out[-1]) + len(buf) + 1 <= MAX_CHARS * 1.2:
            out[-1] = f"{out[-1]}\n{buf}"
        else:
            out.append(buf)
    return out


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _skip_arrangement(lines: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """Drop the "Arrangement of Sections" contents list at the start of an Act.

    It lists every section ("1. Short title", "2. Interpretation" ...) and
    would otherwise be read as the sections themselves. The Act proper
    starts at its long title, "AN ACT of Parliament to ...".
    """
    start = next((i for i, (_, l) in enumerate(lines) if re.match(r"^ARRANGEMENT OF SECTIONS", l, re.I)), None)
    if start is None:
        return lines
    end = next((i for i, (_, l) in enumerate(lines[start:], start) if re.match(r"^AN ACT\b", l, re.I)), None)
    if end is None:
        return lines
    return lines[:start] + lines[end:]


def chunk_legal_text(text: str) -> list[LegalChunk]:
    """Split a whole document (pages separated by "\\f") into cited chunks."""
    has_pages = PAGE_BREAK in text
    lines: list[tuple[int, str]] = []
    for page_no, page in enumerate(text.split(PAGE_BREAK), start=1):
        for line in clean(page).split("\n"):
            lines.append((page_no, line))
    lines = _skip_arrangement(lines)

    blocks = _blocks(lines)
    # The text before section 1 of an Act is its long title, which says what
    # the Act is for. Worth keeping, and worth a label a citation can use.
    if blocks and blocks[0][0] is None and any(re.match(r"^AN ACT\b", l, re.I) for _, l in blocks[0][1]):
        blocks[0] = ("Long title", blocks[0][1])

    chunks: list[LegalChunk] = []
    for label, block in blocks:
        # Track where each piece starts so it can cite its page.
        body = "\n".join(t for _, t in block).strip()
        offsets, pos = [], 0
        for page, t in block:
            offsets.append((pos, page))
            pos += len(t) + 1

        definitions = _split_definitions(body) if label and label.startswith("Section") else None
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
            for piece in _split_long(part_text):
                probe = piece[len(intro) + 1:] if definitions and intro and piece.startswith(intro) else piece
                probe = probe[:40]
                start = body.find(probe, search_from)
                if start < 0:
                    start = search_from
                search_from = start + 1
                page = next((p for off, p in reversed(offsets) if off <= start), block[0][0])
                chunks.append(LegalChunk(section=part_label, text=piece, page=page if has_pages else None))
    return chunks
