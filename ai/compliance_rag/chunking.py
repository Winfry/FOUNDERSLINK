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
    # The heading runs up to the first subsection "(1)" or the end of the line.
    title = re.split(r"\s\(\d", rest, maxsplit=1)[0].strip().rstrip(".—–-")
    return title[:90]


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
                flush()
                last_number = number
                found_sections = True
                title = _short_title(m_sec.group(2))
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

        search_from = 0
        for piece in _split_long(body):
            start = body.find(piece[:40], search_from)
            if start < 0:
                start = search_from
            search_from = start + 1
            page = next((p for off, p in reversed(offsets) if off <= start), block[0][0])
            chunks.append(LegalChunk(section=label, text=piece, page=page if has_pages else None))
    return chunks
