from ai.matching.filters import Check


def explain(checks: list[Check], band: str) -> str:
    """One or two plain sentences: why it fits, or why it does not.
    Built only from the checks, so it never claims anything unverified."""
    if band == "not_a_fit":
        shown = [c for c in checks if c.hard_miss]
    else:
        # Lead with what fits, then mention at most one thing to watch.
        shown = [c for c in checks if c.fits and c.credit == 1][:3]
        shown += [c for c in checks if c.credit < 1][:1]
    if not shown:
        shown = checks[:1]
    return ". ".join(c.text for c in shown) + "."
