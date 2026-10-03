# Turns a founder's free-text description (English, Swahili or Sheng) into
# onboarding fields. Rule-based first version: it only returns fields it is
# confident about, and the founder confirms everything before it is saved.
# Next step: an LLM pass that fills the gaps, validated against options.py.

import re

from ai.extraction.options import COUNTIES
from ai.extraction.sheng import normalise

SECTOR_WORDS = {
    "health": r"clinic|hospital|health|afya|dawa|pharmac|chemist|medical|hospitali|kliniki",
    "agri": r"farm|shamba|agri|kilimo|mifugo|dairy|maziwa|poultry|kuku|crop|mazao|ng'ombe",
    "fintech": r"fintech|payments?|mobile money|lending|mkopo|savings app|wallet",
    "climate": r"climate|solar|recycl|clean energy|waste|taka|biogas|e-?mobility",
    "retail": r"shop|duka|salon|kinyozi|boutique|mitumba|kiosk|retail|biashara ya nguo|hardware",
    "education": r"school|tutor|edtech|elimu|learning|shule|masomo|training",
    "logistics": r"delivery|logistics|boda|transport|courier|usafiri|matatu|truck",
}


# Checked in order: "not registered" must win over "registered".
STATUS_WORDS = {
    "informal": r"\b(not registered|unregistered|informal|haijasajiliwa|bado sijasajili)\b",
    "idea": r"\b(just an idea|only an idea|wazo tu|planning to start|want to start|nataka kuanzisha)\b",
    "limited_company": r"\b(ltd|limited company|limited|incorporated)\b",
    "registered_business_name": r"\b(registered|business name|nimesajili|imesajiliwa)\b",
}

STAGE_WORDS = {
    "growth": r"\b(scaling|scale up|expanding to|growth stage)\b",
    "early_revenue": r"\b(customers|paying users|revenue|sales|mauzo|wateja)\b",
    "mvp": r"\b(mvp|prototype|pilot|beta|working product)\b",
    "idea": r"\b(idea stage|just an idea|wazo)\b",
}

INSTRUMENT_WORDS = {
    "equity": r"\b(equity|shares|hisa|investor)\b",
    "convertible_note": r"\bconvertible\b",
    "loan": r"\b(loan|mkopo|credit)\b",
    "grant": r"\b(grant|ruzuku)\b",
}

# Swahili and shorthand multipliers. "laki" is a hundred thousand.
MULTIPLIER = {
    "k": 1_000, "elfu": 1_000, "thousand": 1_000,
    "laki": 100_000,
    "m": 1_000_000, "mil": 1_000_000, "million": 1_000_000, "milioni": 1_000_000,
}

AMOUNT = re.compile(
    r"(?:(laki|milioni|elfu)\s+(\d+(?:[.,]\d+)?))"  # "laki 2", "milioni 1.5"
    r"|(\d+(?:[.,]\d+)*)\s*(k|m|mil|million|milioni|thousand|elfu|laki)?\b",
    re.IGNORECASE,
)


def _first_match(text: str, table: dict[str, str]) -> str | None:
    for value, pattern in table.items():
        # Match at the start of a word only: "nataka" (I want) must not hit "taka" (waste).
        if re.search(rf"\b(?:{pattern})", text, re.IGNORECASE):
            return value
    return None


def _amount(text: str) -> int | None:
    best = None
    for m in AMOUNT.finditer(text):
        if m.group(1):
            unit, number = m.group(1).lower(), float(m.group(2).replace(",", "."))
        else:
            unit = (m.group(4) or "").lower()
            raw = m.group(3)
            # With a unit, "1.5m" is a decimal. Without one, "150,000" has separators.
            number = float(raw.replace(",", ".")) if unit else float(re.sub(r"[.,]", "", raw))
            # A bare year ("started in 2023") is not an amount.
            if not unit and re.fullmatch(r"(19|20)\d\d", raw):
                continue
        value = round(number * MULTIPLIER.get(unit, 1))
        if value >= 1_000 and (best is None or value > best):
            best = value
    return best


def extract_profile(free_text: str, language: str | None = None) -> dict:
    # Sheng and spoken Swahili amounts first: "ngiri hamsini" -> "50000".
    text = normalise(free_text.strip())
    fields: dict = {}

    if sector := _first_match(text, SECTOR_WORDS):
        fields["sector"] = sector

    lowered = text.lower()
    if county := next((c for c in COUNTIES if c.lower() in lowered), None):
        fields["county"] = county

    # Every founder is on the startup path for now (TEAM_DECISIONS D11).
    fields["journey_type"] = "startup"

    if status := _first_match(text, STATUS_WORDS):
        fields["business_status"] = status

    if stage := _first_match(text, STAGE_WORDS):
        fields["stage"] = stage

    instruments = [i for i, p in INSTRUMENT_WORDS.items() if re.search(p, text, re.IGNORECASE)]
    if instruments:
        fields["instruments"] = instruments

    if amount := _amount(text):
        fields["funding_amount_kes"] = amount

    return fields
