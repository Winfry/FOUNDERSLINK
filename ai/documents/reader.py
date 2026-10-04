# Gets the text out of an uploaded document, inside the AI service.
#
# PDFs with a text layer (certificates downloaded from eCitizen or iTax)
# are read directly. Photos and scans need OCR, which only runs when
# Tesseract is installed; otherwise the document is reported as
# unreadable and an admin reviews it by hand. Nothing is ever guessed.

import io
import logging
from dataclasses import dataclass, field

log = logging.getLogger(__name__)

PDF = "application/pdf"
IMAGES = {"image/jpeg", "image/png"}

# Fewer characters than this means there is no real text layer: a scan.
MIN_TEXT = 40


@dataclass
class ReadResult:
    text: str
    readable: bool
    reason: str | None = None
    # PDF producer and dates, used to spot documents edited after issue.
    metadata: dict = field(default_factory=dict)


def _read_pdf(data: bytes) -> ReadResult:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            return ReadResult("", False, "The PDF is password-protected")
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        meta = reader.metadata or {}
        metadata = {
            "producer": str(meta.get("/Producer") or ""),
            "creator": str(meta.get("/Creator") or ""),
            "created": str(meta.get("/CreationDate") or ""),
            "modified": str(meta.get("/ModDate") or ""),
        }
    except Exception as err:  # a damaged or fake file
        log.info("PDF could not be read: %s", err)
        return ReadResult("", False, "The file could not be opened as a PDF")

    if len(text.strip()) < MIN_TEXT:
        return ReadResult(text, False, "The PDF has no readable text: it looks like a scan", metadata)
    return ReadResult(text, True, None, metadata)


def _read_image(data: bytes) -> ReadResult:
    try:
        import pytesseract
        from PIL import Image

        text = pytesseract.image_to_string(Image.open(io.BytesIO(data)))
    except Exception:
        return ReadResult("", False, "Photos and scans can't be read automatically yet")
    if len(text.strip()) < MIN_TEXT:
        return ReadResult(text, False, "The photo is not clear enough to read")
    return ReadResult(text, True)


def read_document(data: bytes, mime_type: str) -> ReadResult:
    if mime_type == PDF:
        return _read_pdf(data)
    if mime_type in IMAGES:
        return _read_image(data)
    return ReadResult("", False, f"{mime_type} files are not supported")
