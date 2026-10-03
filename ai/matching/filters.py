# Structured checks between a founder's profile and a funder. Each check
# becomes one signal the founder can read on the card.

from dataclasses import dataclass

from ai.service.schemas import Candidate, MatchProfile

JOURNEY_LABEL = {"startup": "startups", "sme": "small businesses"}

# A miss on a hard signal rules the funder out. Instruments are only a
# preference, and the mandate check (in the pipeline) is never decisive.
HARD_SIGNALS = {"journey", "sector", "stage", "county", "amount"}


@dataclass
class Check:
    signal: str
    fits: bool
    text: str
    # Share of the signal's weight earned: 1 for a fit, 0 for a miss,
    # something in between when we cannot tell.
    credit: float

    @property
    def hard_miss(self) -> bool:
        return not self.fits and self.signal in HARD_SIGNALS


def kes(n: int) -> str:
    return f"KSh {n:,}"


def _words(items: list[str]) -> str:
    return ", ".join(i.replace("_", " ") for i in items)


def check(p: MatchProfile, f: Candidate) -> list[Check]:
    checks: list[Check] = []

    def add(signal: str, fits: bool, text: str, credit: float | None = None) -> None:
        checks.append(Check(signal, fits, text, credit if credit is not None else float(fits)))

    mine = JOURNEY_LABEL.get(p.journey_type, p.journey_type)
    if not f.journey_types or p.journey_type in f.journey_types:
        add("journey", True, f"Funds {mine}")
    else:
        theirs = " and ".join(JOURNEY_LABEL.get(j, j) for j in f.journey_types)
        add("journey", False, f"Funds {theirs}, not {mine}")

    if not f.sectors:
        add("sector", True, "Open to all sectors")
    elif p.sector in f.sectors:
        add("sector", True, f"Funds {p.sector} businesses")
    else:
        add("sector", False, f"Focuses on {_words(f.sectors)}, not {p.sector}")

    # Stage only applies to startups: SME profiles have no stage.
    if p.journey_type == "startup":
        if not f.stages:
            add("stage", True, "Open to any stage")
        elif p.stage is None:
            add("stage", True, f"You have not said your stage. They fund: {_words(f.stages)}", 0.5)
        elif p.stage in f.stages:
            add("stage", True, f"Funds businesses at the {_words([p.stage])} stage")
        else:
            add("stage", False, f"Funds businesses at these stages: {_words(f.stages)}")

    if not f.counties:
        add("county", True, "Available nationwide")
    elif p.county in f.counties:
        add("county", True, f"Available in {p.county}")
    else:
        add("county", False, f"Only available in {', '.join(f.counties)}")

    need = p.funding_amount_kes
    span = f"{kes(f.ticket_min_kes)} to {kes(f.ticket_max_kes)}"
    if need is None:
        add("amount", True, f"You have not said how much you need. They fund {span}", 0.5)
    elif need < f.ticket_min_kes:
        add("amount", False, f"You need {kes(need)}; their minimum is {kes(f.ticket_min_kes)}")
    elif need > f.ticket_max_kes:
        add("amount", False, f"You need {kes(need)}; their maximum is {kes(f.ticket_max_kes)}")
    else:
        add("amount", True, f"Your {kes(need)} is within their range of {span}")

    if p.instruments and f.instruments:
        shared = [i for i in f.instruments if i in p.instruments]
        if shared:
            add("instrument", True, f"Offers {_words(shared)}, which you are open to")
        else:
            add("instrument", False, f"Offers {_words(f.instruments)}; you asked for {_words(p.instruments)}")

    return checks
