from __future__ import annotations

import logging

log = logging.getLogger(__name__)

# applies_when key -> the profile field it is checked against.
LIST_CONDITIONS = {
    "journey_types": "journey_type",
    "business_statuses": "business_status",
    "counties": "county",
    "sectors": "sector",
}
YES_NO_CONDITIONS = ("has_employees", "handles_personal_data")
KNOWN_CONDITIONS = set(LIST_CONDITIONS) | set(YES_NO_CONDITIONS)


def _unanswered(profile: dict, when: dict) -> list[str]:
    """Yes/no questions this item depends on that the founder has not answered."""
    return [key for key in YES_NO_CONDITIONS
            if isinstance(when.get(key), bool) and profile.get(key) is None]


def applies_to(profile: dict, applies_when: dict | None) -> bool:
    """Whether every condition on an item holds for this founder."""
    when = applies_when or {}
    for key, field in LIST_CONDITIONS.items():
        allowed = when.get(key)
        if isinstance(allowed, list) and allowed and profile.get(field) not in allowed:
            return False
    for key in YES_NO_CONDITIONS:
        required = when.get(key)
        if isinstance(required, bool) and profile.get(key) is not required:
            return False
    return True


def in_scope(item: dict, scope: str, deal_type: str | None) -> bool:
    """A business checklist shows business items; a deal checklist shows
    only the items for that kind of deal."""
    if item.get("scope", "business") != scope:
        return False
    return scope != "deal" or item.get("deal_type") == deal_type


def applicable_items(profile: dict, items: list[dict], scope: str = "business",
                     deal_type: str | None = None) -> dict:
    """The ids of the items that apply, in the order they were sent.

    Returns {"item_ids": [...], "needs_answer": {question: [item ids]}}.
    """
    item_ids: list[str] = []
    needs_answer: dict[str, list[str]] = {}

    for item in items:
        if not in_scope(item, scope, deal_type):
            continue
        when = item.get("applies_when") or {}
        unknown = set(when) - KNOWN_CONDITIONS
        if unknown:
            # Ignored, like the stand-in does, so both sides agree. Logged so
            # whoever wrote the condition finds out it has no effect.
            log.warning("Compliance item %s has conditions the rules do not know: %s", item.get("id"), sorted(unknown))

        if applies_to(profile, when):
            item_ids.append(item["id"])
            continue

        # Held back only because a yes/no question is unanswered?
        pending = _unanswered(profile, when)
        if pending:
            answered_yes = {**profile, **{key: when[key] for key in pending}}
            if applies_to(answered_yes, when):
                for key in pending:
                    needs_answer.setdefault(key, []).append(item["id"])

    return {"item_ids": item_ids, "needs_answer": needs_answer}