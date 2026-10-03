# Ranks funders for one founder: structured checks, plus how closely the
# founder's description matches each funder's mandate in meaning.

from ai.embeddings.model import Embedder
from ai.explanations.explain import explain
from ai.matching.filters import Check, check
from ai.ranking import scoring
from ai.ranking.weights import MANDATE_HIGH, MANDATE_LOW
from ai.service.schemas import Candidate, MatchProfile, RecommendItem, Signal


def _founder_text(p: MatchProfile) -> str:
    parts = [p.description]
    if p.use_of_funds:
        parts.append(f"Funds needed for: {p.use_of_funds}")
    return " ".join(parts)


def _mandate_check(similarity: float) -> Check:
    if similarity >= MANDATE_HIGH:
        return Check("mandate", True, "What you described matches what they say they fund", 1.0)
    if similarity >= MANDATE_LOW:
        return Check("mandate", True, "What you described partly matches what they say they fund", 0.5)
    return Check("mandate", False, "What you described is not close to what they say they fund", 0.0)


def recommend(
    profile: MatchProfile, candidates: list[Candidate], embedder: Embedder | None
) -> list[RecommendItem]:
    """Returns a verdict for every candidate, in the order they were sent.
    The backend relies on getting all of them back."""
    similarities = (
        embedder.similarities(_founder_text(profile), [c.mandate_text for c in candidates])
        if embedder
        else [None] * len(candidates)
    )

    items = []
    for candidate, similarity in zip(candidates, similarities):
        checks = check(profile, candidate)
        if similarity is not None:
            checks.append(_mandate_check(similarity))
        band = scoring.band(checks)
        items.append(
            RecommendItem(
                candidate_id=candidate.id,
                score=scoring.score(checks),
                band=band,
                signals=[Signal(signal=c.signal, fits=c.fits, text=c.text) for c in checks],
                explanation=explain(checks, band),
            )
        )
    return items
