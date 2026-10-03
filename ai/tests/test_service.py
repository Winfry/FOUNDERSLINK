# Run from the repository root:  python -m pytest ai/tests

import pytest

from ai.extraction import options
from ai.tests.conftest import KEY


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_rejects_calls_without_the_key(client, candidates, profile):
    res = client.post("/recommend", json={"profile": profile(), "candidates": candidates})
    assert res.status_code == 401


def test_recommend_answers_for_every_candidate(client, candidates, profile):
    res = client.post("/recommend", json={"profile": profile(), "candidates": candidates}, headers=KEY)
    assert res.status_code == 200
    items = res.json()
    assert [i["candidate_id"] for i in items] == [c["id"] for c in candidates]
    for item in items:
        assert 0 <= item["score"] <= 1
        assert item["band"] in {"strong", "good", "possible", "not_a_fit"}
        assert item["signals"] and item["explanation"]


def test_recommend_rules_out_funders_for_clear_reasons(client, candidates, profile):
    items = client.post("/recommend", json={"profile": profile(), "candidates": candidates}, headers=KEY).json()
    by_name = {c["name"]: i for c, i in zip(candidates, items)}
    assert by_name["Savanna Angels Network (demo)"]["band"] != "not_a_fit"
    # Rift's minimum ticket is KSh 10M; she needs KSh 1M.
    rift = by_name["Rift Growth Fund (demo)"]
    assert rift["band"] == "not_a_fit"
    assert any(s["signal"] == "amount" and not s["fits"] for s in rift["signals"])


def test_sme_profiles_are_not_checked_on_stage(client, candidates, profile):
    sme = profile(journey_type="sme", stage=None, instruments=[], sector="retail",
                  description="Salon in Mombasa", county="Mombasa", funding_amount_kes=150_000)
    items = client.post("/recommend", json={"profile": sme, "candidates": candidates}, headers=KEY).json()
    assert all(s["signal"] != "stage" for i in items for s in i["signals"])


@pytest.mark.parametrize(
    "text, expected",
    [
        ("Nina salon Mombasa, nataka 150k ya stock",
         {"journey_type": "startup", "sector": "retail", "county": "Mombasa", "funding_amount_kes": 150_000}),
        ("Duka langu Kisumu haijasajiliwa, nahitaji laki 2",
         {"sector": "retail", "county": "Kisumu", "business_status": "informal", "funding_amount_kes": 200_000}),
        ("We are a fintech startup in Nairobi with a working product, raising KSh 1.5m in equity",
         {"journey_type": "startup", "sector": "fintech", "stage": "mvp", "funding_amount_kes": 1_500_000}),
        ("My farm started in 2023 and is not registered",
         {"sector": "agri", "business_status": "informal"}),
    ],
)
def test_extract_profile(client, text, expected):
    fields = client.post("/extract-profile", json={"free_text": text}, headers=KEY).json()
    for key, value in expected.items():
        assert fields.get(key) == value, (key, fields)
    if "funding_amount_kes" not in expected:
        assert "funding_amount_kes" not in fields


def test_extracted_values_are_allowed_options(client):
    text = "Kilimo startup in Murang'a, MVP, looking for a grant or loan of 2 million"
    fields = client.post("/extract-profile", json={"free_text": text}, headers=KEY).json()
    allowed = {
        "journey_type": options.JOURNEY_TYPES, "sector": options.SECTORS, "county": options.COUNTIES,
        "stage": options.STAGES, "business_status": options.BUSINESS_STATUSES,
    }
    for key, values in allowed.items():
        if key in fields:
            assert fields[key] in values
    assert all(i in options.INSTRUMENTS for i in fields.get("instruments", []))
