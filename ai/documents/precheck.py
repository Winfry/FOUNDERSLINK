# Reads a business document and checks it against the member's profile
# (TEAM_DECISIONS D12). It prepares the admin's review; it never says a
# document is genuine. Only the official register or a person can.
#
# The patterns below follow the documents' published formats. Check them
# against real certificates before relying on them, and add a test for
# every new format.

import re
from datetime import date
from difflib import SequenceMatcher

from ai.documents.reader import read_document

BUSINESS_REGISTRATION = "business_registration"
KRA_PIN_CERTIFICATE = "kra_pin_certificate"

# Words that show the document is the type it was uploaded as.
TYPE_WORDS = {
    BUSINESS_REGISTRATION: r"certificate of (registration|incorporation)|business names act|companies act|registrar of (companies|business names)|business registration service",
    KRA_PIN_CERTIFICATE: r"personal identification number|pin certificate|kenya revenue authority",
}

# A KRA PIN: A (individual) or P (non-individual), nine digits, a letter.
KRA_PIN = re.compile(r"\b([AP]\d{9}[A-Z])\b")

# BRS numbers start with the kind of entity, e.g. BN- for a business name
# or PVT- for a private company.
REGISTRATION_NUMBER = re.compile(r"\b((?:BN|PVT|CPR|CLG|LLP)[-/ ]?[A-Z0-9]{4,12})\b")
LABELLED_NUMBER = re.compile(r"(?:registration|certificate|reg\.?)\s*(?:number|no\.?)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/\-]{3,20})", re.I)

NAME_LABELS = re.compile(
    r"(?:business name|name of (?:the )?business|company name|name of (?:the )?company|taxpayer name)\s*[:\-]?\s*(.+)",
    re.I,
)
CERTIFY_THAT = re.compile(r"certif(?:y|ies) that\s+(.+?)\s+(?:is|has been|was)\b", re.I | re.S)

MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july",
     "august", "september", "october", "november", "december"], start=1)}
DATE_PATTERNS = [
    (re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b"), "dmy"),
    (re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b"), "ymd"),
    (re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(" + "|".join(MONTHS) + r"),?\s+(\d{4})\b", re.I), "d_month_y"),
]

# Tools commonly used to edit a PDF after it was issued.
EDITORS = re.compile(r"photoshop|gimp|pdf-?xchange|sejda|ilovepdf|smallpdf|pdfescape|phantompdf|pdffiller|canva", re.I)

SUFFIXES = {"ltd", "limited", "plc", "llp", "company", "co", "the", "and", "&"}


def _clean_name(value: str) -> str:
    value = value.strip().splitlines()[0]
    return re.sub(r"\s{2,}", " ", value).strip(" .,:;-")[:120]


def _name_tokens(value: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", value.lower())
    return {w for w in words if w not in SUFFIXES}


def _find_name(text: str) -> str | None:
    if m := NAME_LABELS.search(text):
        return _clean_name(m.group(1))
    if m := CERTIFY_THAT.search(text):
        return _clean_name(m.group(1))
    return None


def _find_dates(text: str) -> list[date]:
    found = []
    for pattern, order in DATE_PATTERNS:
        for m in pattern.finditer(text):
            try:
                if order == "dmy":
                    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                elif order == "ymd":
                    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
                else:
                    d, mo, y = int(m.group(1)), MONTHS[m.group(2).lower()], int(m.group(3))
                found.append(date(y, mo, d))
            except ValueError:
                continue
    return found


def _name_matches(document_name: str | None, text: str, profile_name: str) -> tuple[bool, str]:
    wanted = _name_tokens(profile_name)
    if not wanted:
        return True, "No business name on the profile to compare"
    if document_name:
        ratio = SequenceMatcher(None, " ".join(sorted(_name_tokens(document_name))), " ".join(sorted(wanted))).ratio()
        if ratio >= 0.85 or wanted <= _name_tokens(document_name):
            return True, f'"{document_name}" matches the profile'
        return False, f'The document says "{document_name}"; the profile says "{profile_name}"'
    if wanted <= _name_tokens(text):
        return True, "The profile's business name appears in the document"
    return False, f'"{profile_name}" does not appear in the document'


def precheck(document_type: str, data: bytes, mime_type: str, profile: dict, today: date | None = None) -> dict:
    """{ fields, checks, concerns, readable } in the shape the backend expects."""
    today = today or date.today()
    read = read_document(data, mime_type)
    if not read.readable:
        return {
            "fields": {},
            "checks": [{"check": "readable", "passed": False, "note": read.reason}],
            "concerns": [f"{read.reason}. An admin needs to review this document by hand."],
            "readable": False,
        }

    text = read.text
    checks, concerns = [], []
    fields: dict[str, str | None] = {}

    def check(name: str, passed: bool, note: str) -> None:
        checks.append({"check": name, "passed": passed, "note": note})
        if not passed:
            concerns.append(note)

    is_type = bool(re.search(TYPE_WORDS.get(document_type, r"$^"), text, re.I))
    check("document_type_matches", is_type,
          "The wording matches this type of document" if is_type
          else "The document does not look like a " + document_type.replace("_", " "))

    name = _find_name(text)
    fields["business_name"] = name
    profile_name = (profile.get("business_name") or "").strip()
    if profile_name:
        passed, note = _name_matches(name, text, profile_name)
        check("name_matches_profile", passed, note)

    if document_type == KRA_PIN_CERTIFICATE:
        pins = sorted(set(KRA_PIN.findall(text)))
        fields["kra_pin"] = pins[0] if pins else None
        check("pin_format_valid", bool(pins),
              f"KRA PIN {pins[0]} has the right format" if pins else "No KRA PIN in the expected format (e.g. P051234567X)")
        if len(pins) > 1:
            check("single_pin", False, f"The document shows more than one PIN: {', '.join(pins)}")

    if document_type == BUSINESS_REGISTRATION:
        m = REGISTRATION_NUMBER.search(text) or LABELLED_NUMBER.search(text)
        fields["registration_number"] = m.group(1) if m else None
        check("registration_number_found", bool(m),
              f"Registration number {m.group(1)}" if m else "No registration number found")

    dates = _find_dates(text)
    issued = min(dates) if dates else None
    fields["issued_on"] = issued.isoformat() if issued else None
    if dates:
        future = [d for d in dates if d > today]
        check("dates_not_in_future", not future,
              "The dates are not in the future" if not future
              else f"The document is dated in the future ({future[0].isoformat()})")

    editor = EDITORS.search(f"{read.metadata.get('producer', '')} {read.metadata.get('creator', '')}")
    if editor:
        check("not_edited", False,
              f"The PDF was saved with an editing tool ({editor.group(0)}). Ask for the original from the issuer")

    return {"fields": fields, "checks": checks, "concerns": concerns, "readable": True}
