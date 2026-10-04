# Co-founder and expert matching (ai/matching/people.py), on the demo
# people in data/seed/. Run: python -m pytest ai/tests

import json
from pathlib import Path

import pytest

from ai.matching.people import needed_profession
from ai.tests.conftest import KEY

SEED = Path(__file__).resolve().parents[2] / "data" / "seed"
EXPERTS = json.loads((SEED / "experts.json").read_text(encoding="utf-8"))
COFOUNDERS = json.loads((SEED / "cofounders.json").read_text(encoding="utf-8"))

# A non-technical health founder in Nairobi looking for a technical co-founder.
SEEKER = {"sector": "health", "county": "Nairobi", "commitment": "full_time",
          "skills": ["marketing", "sales"], "skills_wanted": ["software_engineering", "mobile_development"],
          "description": "A health app that books clinic visits for mothers in Nairobi"}


def people(client, kind, candidates, seeker=SEEKER, need="", language="en"):
    res = client.post("/recommend-people", headers=KEY, json={
        "kind": kind, "seeker": seeker, "need": need, "candidates": candidates, "language": language})
    assert res.status_code == 200, res.text
    return {r["candidate_id"]: r for r in res.json()}


def test_the_technical_health_cofounder_in_nairobi_is_a_strong_fit(client):
    out = people(client, "cofounder", COFOUNDERS)
    assert out["c01"]["band"] == "strong"
    assert "software engineering" in out["c01"]["explanation"].lower()
    assert max(out.values(), key=lambda r: r["score"])["candidate_id"] == "c01"


def test_someone_not_open_to_cofounding_is_not_a_fit(client):
    out = people(client, "cofounder", COFOUNDERS)
    assert out["c05"]["band"] == "not_a_fit"
    assert "not looking" in out["c05"]["explanation"].lower()


def test_someone_without_the_skills_needed_is_not_a_fit(client):
    out = people(client, "cofounder", COFOUNDERS)
    assert out["c03"]["band"] == "not_a_fit"


def test_the_same_skills_as_the_founder_are_flagged(client):
    out = people(client, "cofounder", COFOUNDERS, seeker={**SEEKER, "skills_wanted": ["marketing"]})
    signals = {s["signal"]: s for s in out["c06"]["signals"]}
    assert signals["same_skills"]["fits"] is False


def test_part_time_and_another_county_lower_the_band(client):
    out = people(client, "cofounder", COFOUNDERS)
    # Mercy has the skills but is part time and works in fintech.
    assert out["c02"]["band"] == "possible"
    assert out["c02"]["score"] < out["c01"]["score"]


def test_no_skills_wanted_is_unknown_not_a_miss(client):
    out = people(client, "cofounder", COFOUNDERS, seeker={**SEEKER, "skills_wanted": []})
    assert out["c03"]["band"] != "not_a_fit"


def test_anyone_not_a_fit_sorts_below_every_fit(client):
    out = people(client, "cofounder", COFOUNDERS)
    fits = [r["score"] for r in out.values() if r["band"] != "not_a_fit"]
    misses = [r["score"] for r in out.values() if r["band"] == "not_a_fit"]
    assert min(fits) > max(misses)


@pytest.mark.parametrize("need, profession", [
    ("I need a shareholder agreement with my co-founder", "lawyer"),
    ("How do I file VAT and set up eTIMS with KRA?", "accountant"),
    ("Help me with my pitch deck before fundraising", "mentor"),
    ("Nahitaji wakili wa mkataba", "lawyer"),
    ("Nisaidie na kodi ya KRA", "accountant"),
    ("hello", None),
])
def test_the_need_tells_which_expert(need, profession):
    assert needed_profession(need) == profession


def test_a_lawyer_is_matched_for_a_shareholder_agreement(client):
    out = people(client, "expert", EXPERTS, need="I need a shareholder agreement with my co-founder")
    assert out["e01"]["band"] == "strong"
    assert out["e02"]["band"] == "not_a_fit"  # an accountant
    assert out["e03"]["band"] == "possible"  # a lawyer, but only in Mombasa and fully booked
    best = max(out.values(), key=lambda r: r["score"])
    assert best["candidate_id"] == "e01"


def test_an_expert_with_no_sessions_left_is_flagged(client):
    out = people(client, "expert", EXPERTS, seeker={**SEEKER, "county": "Mombasa"}, need="Review my supplier contract")
    signals = {s["signal"]: s for s in out["e03"]["signals"]}
    assert signals["availability"]["fits"] is False
    assert out["e03"]["band"] == "good"


def test_an_accountant_for_tax_in_swahili(client):
    out = people(client, "expert", EXPERTS, seeker={**SEEKER, "sector": "retail"},
                 need="Nisaidie na kodi ya KRA na eTIMS", language="sw")
    assert out["e02"]["band"] == "strong"
    assert "mhasibu" in out["e02"]["explanation"]


def test_every_candidate_comes_back_in_order(client):
    res = client.post("/recommend-people", headers=KEY, json={
        "kind": "expert", "seeker": SEEKER, "need": "tax", "candidates": EXPERTS})
    assert [r["candidate_id"] for r in res.json()] == [e["id"] for e in EXPERTS]


def test_people_matching_requires_the_key_and_ids(client):
    assert client.post("/recommend-people", json={"kind": "expert"}).status_code == 401
    res = client.post("/recommend-people", headers=KEY, json={"kind": "expert", "candidates": [{"name": "x"}]})
    assert res.status_code == 422
