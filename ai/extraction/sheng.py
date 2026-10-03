# Rewrites Sheng and spoken Swahili into words and numbers the rest of
# the AI already understands, before anything else reads the text:
#
#   "Niko na biz ya mtumba, nataka ngiri hamsini"
#   -> "niko na biashara ya mitumba, nataka 50000"
#
# The word list lives in lexicons/sheng.json so anyone on the team can
# add a word without touching code.

import json
import re
from functools import lru_cache
from pathlib import Path

LEXICON = Path(__file__).parent / "lexicons" / "sheng.json"


@lru_cache(maxsize=1)
def lexicon() -> dict:
    data = json.loads(LEXICON.read_text(encoding="utf-8"))
    # Drop the "_note" and "_about" keys, which are for people.
    return {k: {w: v for w, v in section.items() if not w.startswith("_")}
            for k, section in data.items() if not k.startswith("_")}


def _alternatives(words) -> str:
    # Longest first, so "thelathini" is tried before "tatu" could match part of it.
    return "|".join(sorted((re.escape(w) for w in words), key=len, reverse=True))


@lru_cache(maxsize=1)
def _patterns():
    lex = lexicon()
    unit = rf"(?:{_alternatives(lex['units'])})"
    ones = rf"(?:{_alternatives(lex['ones'])})"
    tens = rf"(?:{_alternatives(lex['tens'])})"
    digits = r"\d+(?:[.,]\d+)?"
    # A number up to 99 in words, or digits: "hamsini", "kumi na tano", "50".
    small = rf"(?:{tens}(?:\s+na\s+{ones})?|{ones}|{digits})"
    group = rf"{unit}\s+{small}"
    # Groups joined by "na", optionally ending in "na nusu" (and a half).
    phrase = rf"\b{group}(?:\s+na\s+(?:{group}|nusu))*\b"
    return re.compile(phrase, re.IGNORECASE), re.compile(rf"\b{unit}\b", re.IGNORECASE)


def _small_value(text: str) -> float:
    lex = lexicon()
    text = text.strip().lower()
    if re.fullmatch(r"\d+(?:[.,]\d+)?", text):
        return float(text.replace(",", "."))
    total = 0
    for word in re.split(r"\s+na\s+", text):
        total += lex["tens"].get(word, 0) + lex["ones"].get(word, 0)
    return total


def amount_of(phrase: str) -> int:
    """The value of a spoken amount such as "laki mbili na ngiri hamsini".
    Each group is a unit followed by its count, and the groups add up."""
    units = lexicon()["units"]
    unit_alt = _alternatives(units)
    total, last_unit = 0.0, 0
    # Split into groups at "na" only where a unit or "nusu" follows, so the
    # "na" inside "kumi na tano" stays with its number.
    parts = re.split(rf"\s+na\s+(?=(?:{unit_alt})\b|nusu\b)", phrase.strip(), flags=re.IGNORECASE)
    for part in parts:
        if part.lower() == "nusu":
            total += last_unit / 2
            continue
        unit_word, count = part.split(None, 1)
        last_unit = units[unit_word.lower()]
        total += last_unit * _small_value(count)
    return round(total)


def normalise(text: str) -> str:
    """Lower-cased text with spoken amounts turned into digits and Sheng
    words turned into the plain words the extractor already knows."""
    phrase, unit_word = _patterns()
    text = phrase.sub(lambda m: str(amount_of(m.group(0))), text.lower())

    # "50 ngiri" and "200 thao": the number comes first. Leave it as a
    # standard unit the extractor reads ("50 elfu").
    standard = {"ngiri": "elfu", "thao": "elfu", "soo": "mia"}
    text = unit_word.sub(lambda m: standard.get(m.group(0).lower(), m.group(0)), text)

    words = lexicon()["words"]
    return re.sub(
        rf"\b(?:{_alternatives(words)})\b",
        lambda m: words[m.group(0).lower()],
        text,
        flags=re.IGNORECASE,
    )
