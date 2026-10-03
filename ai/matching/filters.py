# Structured checks between a founder's profile and a funder. Each check
# becomes one signal the founder can read on the card.

from dataclasses import dataclass

from ai.explanations.messages import kes, label, labels, t
from ai.service.schemas import Candidate, MatchProfile

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

    @property
    def unknown(self) -> bool:
        """A fit we could not confirm because the founder left something out."""
        return self.fits and self.credit < 1


def check(p: MatchProfile, f: Candidate, lang: str = "en") -> list[Check]:
    checks: list[Check] = []

    def add(signal: str, fits: bool, key: str, credit: float | None = None, **params) -> None:
        text = t(key, lang, **params)
        checks.append(Check(signal, fits, text, credit if credit is not None else float(fits)))

    mine = label("journey", p.journey_type, lang)
    if not f.journey_types or p.journey_type in f.journey_types:
        add("journey", True, "journey.fit", mine=mine)
    else:
        add("journey", False, "journey.miss", mine=mine, theirs=labels("journey", f.journey_types, lang))

    sector = label("sector", p.sector, lang)
    if not f.sectors:
        add("sector", True, "sector.any")
    elif p.sector in f.sectors:
        add("sector", True, "sector.fit", sector=sector)
    else:
        add("sector", False, "sector.miss", sector=sector, sectors=labels("sector", f.sectors, lang))

    # Stage only applies to startups: SME profiles have no stage.
    if p.journey_type == "startup":
        stages = labels("stage", f.stages, lang)
        if not f.stages:
            add("stage", True, "stage.any")
        elif p.stage is None:
            add("stage", True, "stage.unknown", 0.5, stages=stages)
        elif p.stage in f.stages:
            add("stage", True, "stage.fit", stage=label("stage", p.stage, lang))
        else:
            add("stage", False, "stage.miss", stages=stages, stage=label("stage", p.stage, lang))

    if not f.counties:
        add("county", True, "county.any")
    elif p.county in f.counties:
        add("county", True, "county.fit", county=p.county)
    else:
        add("county", False, "county.miss", counties=", ".join(f.counties))

    need = p.funding_amount_kes
    low, high = kes(f.ticket_min_kes), kes(f.ticket_max_kes)
    if need is None:
        add("amount", True, "amount.unknown", 0.5, low=low, high=high)
    elif need < f.ticket_min_kes:
        add("amount", False, "amount.low", need=kes(need), low=low)
    elif need > f.ticket_max_kes:
        add("amount", False, "amount.high", need=kes(need), high=high)
    else:
        add("amount", True, "amount.fit", need=kes(need), low=low, high=high)

    if p.instruments and f.instruments:
        shared = [i for i in f.instruments if i in p.instruments]
        if shared:
            add("instrument", True, "instrument.fit", shared=labels("instrument", shared, lang))
        else:
            add("instrument", False, "instrument.miss",
                theirs=labels("instrument", f.instruments, lang), mine=labels("instrument", p.instruments, lang))

    return checks
