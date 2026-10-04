# Checks data/seed/investors.json against the backend's own loading rules
# (backend/scripts/load-data.ts and src/modules/funding/funder.schema.ts),
# so `npm run db:seed` can't fail on demo day. Allowed values are read from
# backend/src/shared/constants.ts, so this test follows the backend.
# Run: python -m pytest ai/tests

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
INVESTORS = json.loads((ROOT / "data" / "seed" / "investors.json").read_text(encoding="utf-8"))
BACKEND_DEMO = json.loads((ROOT / "backend" / "data" / "demo-funders.json").read_text(encoding="utf-8"))
ITEM_IDS = {i["id"] for i in json.loads((ROOT / "backend" / "data" / "demo-compliance-items.json").read_text(encoding="utf-8"))}
CONSTANTS = (ROOT / "backend" / "src" / "shared" / "constants.ts").read_text(encoding="utf-8")


def backend_list(name: str) -> set[str]:
    m = re.search(rf"export const {name} = \[(.*?)\] as const", CONSTANTS, re.S)
    assert m, f"{name} not found in constants.ts"
    return set(re.findall(r'"([^"]+)"', m.group(1)))


KINDS = backend_list("FUNDER_KINDS")
JOURNEYS = backend_list("JOURNEY_TYPES")
SECTORS = backend_list("SECTORS")
STAGES = backend_list("STAGES")
COUNTIES = backend_list("COUNTIES")
INSTRUMENTS = backend_list("INSTRUMENTS")
ELIGIBILITY = backend_list("ELIGIBILITY_FLAGS")
ALLOWED_FIELDS = {
    "name", "kind", "mandate_text", "journey_types", "sectors", "stages", "counties", "instruments",
    "ticket_min_kes", "ticket_max_kes", "requirements", "eligibility", "application_fee_kes", "serves_groups",
    "deadline", "how_to_apply_url", "source_url", "last_verified_at", "verified_by", "is_demo",
}


@pytest.mark.parametrize("funder", INVESTORS, ids=[f["name"] for f in INVESTORS])
def test_each_investor_passes_the_backend_rules(funder):
    assert set(funder) <= ALLOWED_FIELDS
    assert 3 <= len(funder["name"].strip()) <= 120
    assert funder["kind"] in KINDS
    assert 10 <= len(funder["mandate_text"].strip()) <= 1000
    assert funder["journey_types"] and set(funder["journey_types"]) <= JOURNEYS
    assert set(funder.get("sectors", [])) <= SECTORS
    assert set(funder.get("stages", [])) <= STAGES
    assert set(funder.get("counties", [])) <= COUNTIES
    assert funder["instruments"] and set(funder["instruments"]) <= INSTRUMENTS
    assert set(funder.get("eligibility", [])) <= ELIGIBILITY
    assert isinstance(funder["ticket_min_kes"], int) and funder["ticket_min_kes"] >= 0
    assert isinstance(funder["ticket_max_kes"], int) and 0 < funder["ticket_max_kes"] <= 2_000_000_000
    assert funder["ticket_min_kes"] <= funder["ticket_max_kes"]
    assert set(funder.get("requirements", [])) <= ITEM_IDS
    assert funder.get("is_demo") is True, "demo records must say so"
    assert funder["name"].endswith("(demo)"), "demo records are named as demo"


def test_names_are_unique():
    names = [f["name"] for f in INVESTORS]
    assert len(names) == len(set(names))


def test_the_backend_demo_investors_are_kept_unchanged():
    # load-data.ts deletes any demo funder missing from the file it loads,
    # and the demo story needs Savanna Angels Network.
    ours = {f["name"]: f for f in INVESTORS}
    for funder in BACKEND_DEMO:
        assert funder["name"] in ours, f"{funder['name']} would be deleted on load"
        assert ours[funder["name"]] == funder, f"{funder['name']} differs from backend/data/demo-funders.json"
