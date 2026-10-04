# Co-founder and expert matching: who should this founder talk to, and why?
# Same answer shape as investor matching (band, signals, explanation), so
# the app can reuse its match cards. Never uses gender, age or ethnicity.

import re

from ai.explanations import explain as explanations
from ai.explanations.messages import label, labels, plural, t
from ai.matching.filters import Check
from ai.ranking import scoring
from ai.ranking.weights import MANDATE_HIGH, MEANING_SHARE
from ai.service.schemas import RecommendItem, Signal

# What a need is about, to know which kind of expert can help.
PROFESSION_WORDS = {
    "lawyer": r"\b(?:legal|lawyer|advocate|contract|agreement|shareholder|term sheet|incorporat|trademark|"
              r"intellectual property|dispute|sheria|wakili|mkataba)",
    "accountant": r"\b(?:tax|kra|etims|vat|paye|bookkeep|books|accounts|accounting|audit|financial statement|"
                  r"payroll|kodi|hesabu|mhasibu)",
    "mentor": r"\b(?:strategy|fundrais|pitch|product|growth|mentor|go-to-market|hiring|marketing|sales|"
              r"ushauri|mshauri)",
}


BAND_RANK = {"not_a_fit": 0, "possible": 1, "good": 2, "strong": 3}


def needed_profession(need: str) -> str | None:
    hits = {p: len(re.findall(w, need.lower())) for p, w in PROFESSION_WORDS.items()}
    best = max(hits, key=hits.get)
    return best if hits[best] else None


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]{4,}", text.lower())}


def _cofounder_checks(seeker: dict, c: dict, lang: str) -> list[Check]:
    checks: list[Check] = []
    if c.get("open_to_cofound") is False:
        checks.append(Check("open", False, t("open.miss", lang), 0.0))

    wanted = seeker.get("skills_wanted") or []
    theirs = c.get("skills") or []
    if not wanted:
        checks.append(Check("skills", True, t("skills.unknown", lang), 0.5))
    else:
        shared = [s for s in wanted if s in theirs]
        if shared:
            checks.append(Check("skills", True, t("skills.fit", lang, skills=labels("skill", shared, lang)), 1.0))
        else:
            checks.append(Check("skills", False, t("skills.miss", lang, skills=labels("skill", wanted, lang)), 0.0))
    mine = seeker.get("skills") or []
    if theirs and set(theirs) <= set(mine):
        checks.append(Check("same_skills", False, t("same_skills.miss", lang), 0.0))

    sector = seeker.get("sector")
    if sector and c.get("sector"):
        if c["sector"] == sector:
            checks.append(Check("sector_interest", True, t("sector_interest.fit", lang, sector=label("sector", sector, lang)), 1.0))
        else:
            checks.append(Check("sector_interest", False, t("sector_interest.miss", lang,
                                theirs=label("sector", c["sector"], lang), sector=label("sector", sector, lang)), 0.0))

    county = seeker.get("county")
    if county and c.get("county"):
        if c["county"] == county:
            checks.append(Check("location", True, t("location.fit", lang, county=county), 1.0))
        else:
            checks.append(Check("location", False, t("location.miss", lang, theirs=c["county"], county=county), 0.0))

    want, can = seeker.get("commitment"), c.get("commitment")
    if want and can:
        if want == can or can == "full_time":
            checks.append(Check("commitment", True, t("commitment.fit", lang, commitment=label("commitment", can, lang)), 1.0))
        else:
            checks.append(Check("commitment", False, t("commitment.miss", lang, commitment=label("commitment", can, lang)), 0.0))
    return checks


def _expert_checks(seeker: dict, need: str, c: dict, lang: str) -> list[Check]:
    checks: list[Check] = []
    profession = needed_profession(need)
    theirs = c.get("profession") or "other"
    if profession:
        if theirs == profession:
            checks.append(Check("profession", True, t("profession.fit", lang, profession=label("profession", theirs, lang)), 1.0))
        else:
            checks.append(Check("profession", False, t("profession.miss", lang, theirs=label("profession", theirs, lang),
                                                         profession=label("profession", profession, lang)), 0.0))

    need_words = _words(need)
    offered = [s for s in c.get("services") or [] if _words(s) & need_words]
    if offered:
        checks.append(Check("services", True, t("services.fit", lang, services=", ".join(offered[:2])), 1.0))

    sector = seeker.get("sector")
    sectors = c.get("sectors") or []
    if sector and (not sectors or sector in sectors):
        checks.append(Check("sector_interest", True, t("sector_interest.fit", lang, sector=label("sector", sector, lang)), 1.0))

    county = seeker.get("county")
    counties = c.get("counties") or []
    if county:
        if not counties or county in counties:
            checks.append(Check("location", True, t("location.covers", lang, county=county), 1.0))
        else:
            checks.append(Check("location", False, t("location.miss", lang, theirs=", ".join(counties), county=county), 0.0))

    left = c.get("office_hours_left")
    if left is not None:
        if left > 0:
            checks.append(Check("availability", True, t("availability.fit", lang, count=left,
                                                          sessions=plural("sessions", left, lang)), 1.0))
        else:
            checks.append(Check("availability", False, t("availability.miss", lang), 0.0))
    return checks


def _candidate_text(kind: str, c: dict) -> str:
    if kind == "expert":
        return " ".join([c.get("bio") or "", "Services: " + ", ".join(c.get("services") or [])])
    return " ".join([c.get("description") or "", "Skills: " + ", ".join(c.get("skills") or [])])


def recommend_people(kind: str, seeker: dict, need: str, candidates: list[dict], lang: str, embedder) -> list[RecommendItem]:
    """A verdict for every candidate, in the order sent."""
    query = " ".join(filter(None, [need, seeker.get("description")]))
    sims = (embedder.similarities(query, [_candidate_text(kind, c) for c in candidates])
            if embedder and query and candidates else [None] * len(candidates))
    known = [s for s in sims if s is not None]
    low, high = (min(known), max(known)) if len(known) > 1 else (0.0, 0.0)

    items = []
    for c, sim in zip(candidates, sims):
        checks = (_expert_checks(seeker, need, c, lang) if kind == "expert"
                  else _cofounder_checks(seeker, c, lang))
        if sim is not None and sim >= MANDATE_HIGH:
            checks.append(Check("meaning", True, t("meaning.fit", lang), 1.0))
        band = scoring.band(checks)
        score = scoring.score(checks)
        if sim is not None and high > low:
            score = (1 - MEANING_SHARE) * score + MEANING_SHARE * (sim - low) / (high - low)
        # The band decides the order first: anyone who is not a fit sorts
        # below every possible fit, however close their background sounds.
        score = round((BAND_RANK[band] + score) / len(BAND_RANK), 2)
        items.append(RecommendItem(
            candidate_id=str(c["id"]), score=score, band=band,
            signals=[Signal(signal=x.signal, fits=x.fits, text=x.text) for x in checks],
            explanation=explanations.explain(checks, band),
        ))
    return items
