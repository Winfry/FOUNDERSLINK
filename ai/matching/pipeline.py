# Ranks funders for one founder: structured checks, plus how closely the
# founder's description matches each funder's mandate in meaning.
#
# /recommend and /explain-fit both go through assess(), so a funder always
# gets the same band on the match card and on its profile page.

from ai.embeddings.model import Embedder
from ai.explanations import explain as explanations
from ai.explanations.messages import t
from ai.matching.filters import Check, check
from ai.ranking import scoring
from ai.ranking.weights import MANDATE_HIGH, MANDATE_LOW
from ai.service.schemas import (
    Candidate,
    FitExplanation,
    MatchProfile,
    RecommendItem,
    Signal,
    TrackRecordItem,
)


def _founder_text(p: MatchProfile) -> str:
    parts = [p.description]
    if p.use_of_funds:
        parts.append(f"Funds needed for: {p.use_of_funds}")
    return " ".join(parts)


def _mandate_check(similarity: float, lang: str) -> Check:
    if similarity >= MANDATE_HIGH:
        return Check("mandate", True, t("mandate.fit", lang), 1.0)
    if similarity >= MANDATE_LOW:
        return Check("mandate", True, t("mandate.partial", lang), 0.5)
    return Check("mandate", False, t("mandate.miss", lang), 0.0)


def _similarities(profile: MatchProfile, candidates: list[Candidate], embedder: Embedder | None):
    if not embedder:
        return [None] * len(candidates)
    return embedder.similarities(_founder_text(profile), [c.mandate_text for c in candidates])


def assess(profile: MatchProfile, candidate: Candidate, similarity: float | None, lang: str = "en") -> list[Check]:
    checks = check(profile, candidate, lang)
    if similarity is not None:
        checks.append(_mandate_check(similarity, lang))
    return checks


def _signals(checks: list[Check]) -> list[Signal]:
    return [Signal(signal=c.signal, fits=c.fits, text=c.text) for c in checks]


def recommend(
    profile: MatchProfile, candidates: list[Candidate], embedder: Embedder | None
) -> list[RecommendItem]:
    """Returns a verdict for every candidate, in the order they were sent.
    The backend relies on getting all of them back."""
    items = []
    for candidate, similarity in zip(candidates, _similarities(profile, candidates, embedder)):
        checks = assess(profile, candidate, similarity)
        band = scoring.band(checks)
        items.append(
            RecommendItem(
                candidate_id=candidate.id,
                score=scoring.score(checks),
                band=band,
                signals=_signals(checks),
                explanation=explanations.explain(checks, band),
            )
        )
    return items


def explain_fit(
    profile: MatchProfile,
    candidate: Candidate,
    track_record: list[TrackRecordItem],
    lang: str,
    embedder: Embedder | None,
) -> FitExplanation:
    """The fit behind one profile page: the same band as the match card,
    one component per signal, reasons in the founder's language, and what
    in the funder's track record is relevant to her."""
    [similarity] = _similarities(profile, [candidate], embedder)
    checks = assess(profile, candidate, similarity, lang)
    band = scoring.band(checks)
    return FitExplanation(
        band=band,
        components=_signals(checks),
        reasons=explanations.fit_reasons(checks, band, lang),
        track_record_highlights=explanations.track_highlights(profile, track_record, lang),
    )
