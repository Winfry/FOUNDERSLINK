# Vetting risk signals (TEAM_DECISIONS D7, D12): what an admin should look
# at in an application, and how urgently. The AI sorts the queue and
# explains why. It never approves or rejects anyone: an admin decides.
#
# Fairness: most Kenyan founders use a free email address and write short
# bios. Those are never held against a founder. The organisation checks
# apply only to people who say they act for an organisation. Names,
# gender, age and location are never used.
#
# The backend sends the email domain, never the address, and no phone
# number. The duplicate-phone check needs the database, so the backend
# adds that signal itself.

import re

from ai.moderation.payment_request_detector import (
    ASKS_MONEY, FEE, PAYMENT_DETAILS, PRESSURE, TOO_GOOD, check_message,
)

STRONG, MEDIUM, WEAK = 3, 2, 1

# Throwaway inboxes: anyone can create one in seconds and abandon it.
DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com",
    "grr.la", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io",
    "yopmail.com", "yopmail.fr", "yopmail.net", "trashmail.com", "trashmail.de", "trashmail.net",
    "getnada.com", "dispostable.com", "maildrop.cc", "mailnesia.com", "mintemail.com", "fakeinbox.com",
    "throwawaymail.com", "mytemp.email", "tempail.com", "emailondeck.com", "mohmal.com", "burnermail.io",
    "spamgourmet.com", "mailcatch.com", "moakt.com", "tempr.email", "discard.email", "mailpoof.com",
    "inboxkitten.com", "tempinbox.com", "spambox.us", "mailforspam.com", "mail-temp.com",
}

# Free personal email providers. Normal for a founder; worth a question
# when someone says they represent a fund or a firm.
FREE_PROVIDERS = {
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "ymail.com", "outlook.com", "hotmail.com",
    "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com",
    "mail.com", "yandex.com", "zoho.com",
}

# Second-level suffixes, so "abc.co.ke" is compared as one organisation.
SECOND_LEVEL = {"co", "or", "ac", "go", "ne", "sc", "me", "info", "com", "org", "net", "gov", "edu"}

# Investor claims that no real investor makes.
NO_REQUIREMENTS = re.compile(
    r"\bno\s+(?:requirements?|paperwork|documents?|questions\s+asked|collateral\s+needed)\b"
    r"|\bfund\s+any\s+(?:business|idea|startup|amount)\b|\bany\s+amount\b|\binstant\s+(?:funding|approval)\b"
)

SHORT_STATEMENT_WORDS = 15
LEVELS = ("low", "medium", "high")


def _organisation_domain(host: str) -> str:
    """'mail.savanna.co.ke' and 'www.savanna.co.ke' -> 'savanna.co.ke'."""
    parts = [p for p in host.lower().strip(".").split(".") if p]
    if len(parts) >= 3 and parts[-2] in SECOND_LEVEL and len(parts[-1]) == 2:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def _website_host(url: str | None) -> str | None:
    if not url:
        return None
    m = re.match(r"^https?://([a-z0-9.-]+\.[a-z]{2,})(?::\d+)?(?:[/?#].*)?$", url.strip(), re.I)
    return m.group(1).lower() if m else None


def assess(application: dict) -> dict:
    """{ "risk_level": "low"|"medium"|"high", "signals": [...] }"""
    role = (application.get("role") or "").lower()
    statement = application.get("statement") or ""
    bio = application.get("bio") or ""
    organisation = (application.get("organisation_name") or "").strip()
    website = application.get("organisation_website")
    domain = (application.get("email_domain") or "").lower().strip()
    acts_for_organisation = role in ("investor", "expert") and bool(organisation)

    found: list[tuple[int, str]] = []

    # Scam language in what they wrote, using the same check as messages.
    text = f"{statement}\n{bio}"
    money = check_message(text)
    if money["flagged"]:
        what = {
            FEE: "mentions a fee that people must pay",
            ASKS_MONEY: "asks for money to be sent",
            PAYMENT_DETAILS: "gives payment details to pay into",
            TOO_GOOD: "promises guaranteed returns or funding",
            PRESSURE: "pushes people to act quickly",
        }
        for reason in money["reasons"]:
            if reason in what:
                found.append((STRONG, f"Their statement or bio {what[reason]}"))

    if role == "investor" and NO_REQUIREMENTS.search(text.lower()):
        found.append((STRONG, "Claims to fund without requirements or for any amount, which real investors don't do"))

    if domain in DISPOSABLE_DOMAINS:
        found.append((STRONG, f"Signed up with a disposable email address ({domain})"))

    if acts_for_organisation and domain in FREE_PROVIDERS:
        found.append((MEDIUM, f"Says they represent {organisation} but signed up with a free email address "
                              f"({domain}). Ask for an organisation email"))

    host = _website_host(website)
    if role == "investor":
        if not website:
            found.append((MEDIUM, "Gave no organisation website to check"))
        elif not host:
            found.append((MEDIUM, f'The website "{website}" is not a valid web address'))

    if acts_for_organisation and host and domain and domain not in FREE_PROVIDERS | DISPOSABLE_DOMAINS:
        if _organisation_domain(domain) != _organisation_domain(host):
            found.append((MEDIUM, f"Email domain ({domain}) differs from the website ({host}). "
                                  "Check they belong to the same organisation"))

    if role in ("investor", "expert") and len(statement.split()) < SHORT_STATEMENT_WORDS:
        found.append((WEAK, "The statement is too short to check against public information"))

    strong = sum(1 for weight, _ in found if weight == STRONG)
    medium = sum(1 for weight, _ in found if weight == MEDIUM)
    weak = sum(1 for weight, _ in found if weight == WEAK)
    if strong or medium >= 2:
        level = "high"
    elif medium or weak >= 2:
        level = "medium"
    else:
        level = "low"

    # Most serious first, so the admin reads the important signal first.
    signals = [s for _, s in sorted(found, key=lambda f: -f[0])]
    return {"risk_level": level, "signals": signals}
