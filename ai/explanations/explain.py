# Turns checks and track records into sentences a founder can act on.
# Everything here is built only from the checks and the track record we
# were sent, so it never claims anything we cannot point to.

from collections import Counter

from ai.explanations.messages import label, labels, plural, t
from ai.matching.filters import Check
from ai.service.schemas import MatchProfile, TrackRecordItem

# Most useful first: whether the amount fits matters more to a founder
# than whether the funder works nationwide.
PRIORITY = ["amount", "sector", "stage", "mandate", "county", "instrument", "journey"]

# How far each kind of track-record entry can be trusted (TEAM_DECISIONS D6).
SOURCES = ["platform_deal", "public", "self_reported"]

MAX_FIT_REASONS = 3
MAX_HIGHLIGHTS = 3


def _ordered(checks: list[Check]) -> list[Check]:
    return sorted(checks, key=lambda c: PRIORITY.index(c.signal) if c.signal in PRIORITY else len(PRIORITY))


def _inline(text: str) -> str:
    """Lower-case the first letter so a sentence can sit inside another one,
    but leave "KSh" and other abbreviations alone."""
    if len(text) > 1 and text[0].isupper() and text[1].islower():
        return text[0].lower() + text[1:]
    return text


def explain(checks: list[Check], band: str) -> str:
    """The one-line explanation on a match card: why it fits, or why not."""
    if band == "not_a_fit":
        shown = [c for c in checks if c.hard_miss]
    else:
        # Lead with what fits, then mention at most one thing to watch.
        shown = [c for c in _ordered(checks) if c.fits and c.credit == 1][:MAX_FIT_REASONS]
        shown += [c for c in checks if c.credit < 1][:1]
    if not shown:
        shown = checks[:1]
    return ". ".join(c.text for c in shown) + "."


def fit_reasons(checks: list[Check], band: str, lang: str) -> list[str]:
    """The reasons on a profile page, one sentence each: a summary, why it
    fits or why not, what to check, and how to clear up anything unknown."""
    reasons = [t(f"band.{band}", lang)]

    if band == "not_a_fit":
        misses = [_inline(c.text) for c in _ordered(checks) if c.hard_miss]
        reasons.append(t("reason.why_not", lang, items="; ".join(misses)))
        return reasons

    confirmed = [_inline(c.text) for c in _ordered(checks) if c.fits and c.credit == 1]
    if confirmed:
        reasons.append(t("reason.why", lang, items="; ".join(confirmed[:MAX_FIT_REASONS])))

    for c in _ordered(checks):
        if c.signal in ("amount", "stage") and c.unknown:
            # Something the founder can fix herself by finishing her profile.
            reasons.append(t(f"action.{c.signal}", lang))
        elif c.credit < 1:
            reasons.append(t("reason.check", lang, item=_inline(c.text)))

    return reasons


def _evidence(items: list[TrackRecordItem], lang: str) -> str:
    counts = Counter(_source(i) for i in items)
    if set(counts) == {"self_reported"}:
        return t("source.only_self_reported", lang)
    return ", ".join(t(f"source.{s}", lang, count=counts[s]) for s in SOURCES if counts[s])


def _source(item: TrackRecordItem) -> str:
    # Anything we do not recognise is treated as the least trusted kind.
    return item.source if item.source in SOURCES else "self_reported"


def _only_claims(items: list[TrackRecordItem]) -> bool:
    return all(_source(i) == "self_reported" for i in items)


def track_highlights(profile: MatchProfile, track: list[TrackRecordItem], lang: str) -> list[str]:
    """What in a funder's past investments is relevant to this founder.
    Each highlight says where its evidence comes from, and a highlight
    built only on self-reported entries is worded as a claim."""
    if not track:
        return []

    highlights: list[str] = []
    mentioned_verified = 0
    sector = label("sector", profile.sector, lang)
    stage = label("stage", profile.stage, lang) if profile.stage else None

    same_sector = [i for i in track if i.sector == profile.sector]
    same_stage = [i for i in track if profile.stage and i.stage == profile.stage]
    both = [i for i in same_sector if profile.stage and i.stage == profile.stage]

    def add(key: str, items: list[TrackRecordItem], **params) -> None:
        nonlocal mentioned_verified
        count = len(items)
        claim = _only_claims(items)
        text = t(
            key, lang,
            count=count,
            verb=t("verb.says" if claim else "verb.has", lang),
            verb_stage=t("verb_stage.says" if claim else "verb_stage.has", lang),
            businesses=plural("businesses", count, lang),
            of=plural("of", count, lang),
            times=plural("times", count, lang),
            **params,
        )
        highlights.append(f"{' '.join(text.split())} ({_evidence(items, lang)})")
        mentioned_verified = max(mentioned_verified, sum(_source(i) == "platform_deal" for i in items))

    if both:
        add("track.sector_stage", both, sector=sector, stage=stage)
    elif same_sector:
        add("track.sector", same_sector, sector=sector)

    if same_stage and not both:
        add("track.stage", same_stage, stage=stage)

    if not same_sector:
        top = [s for s, _ in Counter(i.sector for i in track).most_common(3)]
        highlights.append(t("track.other_sectors", lang, sector=sector, sectors=labels("sector", top, lang)))

    verified = sum(_source(i) == "platform_deal" for i in track)
    if verified > mentioned_verified:
        highlights.append(t("track.verified_deals", lang, count=verified, deals=plural("deals", verified, lang)))

    return highlights[:MAX_HIGHLIGHTS]
