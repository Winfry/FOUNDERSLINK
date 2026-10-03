from ai.matching.filters import Check
from ai.ranking.weights import SIGNAL_WEIGHTS


def score(checks: list[Check]) -> float:
    """Weighted share of the available credit, in [0, 1]. Used for sorting only."""
    possible = sum(SIGNAL_WEIGHTS.get(c.signal, 0) for c in checks)
    if possible == 0:
        return 0.0
    earned = sum(SIGNAL_WEIGHTS.get(c.signal, 0) * c.credit for c in checks)
    return round(earned / possible, 2)


def band(checks: list[Check]) -> str:
    """A funder is out if any hard signal misses. Otherwise the band drops
    by one step for each soft miss or unknown."""
    if any(c.hard_miss for c in checks):
        return "not_a_fit"
    soft = sum(1 for c in checks if c.credit < 1)
    return "strong" if soft == 0 else "good" if soft == 1 else "possible"
