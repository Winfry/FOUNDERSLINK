# Run from the repository root:  python -m pytest ai/tests
# Uses the backend's demo funders so both sides test against the same data.

import json
import os
from pathlib import Path

os.environ["EMBEDDING_MODEL"] = "none"
os.environ["AI_SERVICE_API_KEY"] = "test-key"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from ai.extraction import options  # noqa: E402
from ai.service.main import app  # noqa: E402

KEY = {"x-internal-api-key": "test-key"}
FUNDERS = Path(__file__).resolve().parents[2] / "backend" / "data" / "demo-funders.json"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def candidates():
    rows = json.loads(FUNDERS.read_text(encoding="utf-8"))
    fields = ["kind", "mandate_text", "journey_types", "sectors", "stages", "counties",
              "instruments", "ticket_min_kes", "ticket_max_kes"]
    return [{"id": f"f{i}", **{k: row.get(k, []) for k in fields}} for i, row in enumerate(rows)]


def startup_profile(**overrides):
    return {
        "journey_type": "startup", "business_status": "registered_business_name",
        "description": "A health app that books clinic visits for mothers in Nairobi",
        "sector": "health", "county": "Nairobi", "funding_amount_kes": 1_000_000,
        "use_of_funds": "Hire a backend developer", "stage": "mvp",
        "instruments": ["equity", "grant"], **overrides,
    }


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_rejects_calls_without_the_key(client, candidates):
    res = client.post("/recommend", json={"profile": startup_profile(), "candidates": candidates})
    assert res.status_code == 401


def test_recommend_answers_for_every_candidate(client, candidates):
    res = client.post("/recommend", json={"profile": startup_profile(), "candidates": candidates}, headers=KEY)
    assert res.status_code == 200
    items = res.json()
    assert [i["candidate_id"] for i in items] == [c["id"] for c in candidates]
    for item in items:
        assert 0 <= item["score"] <= 1
        assert item["band"] in {"strong", "good", "possible", "not_a_fit"}
        assert item["signals"] and item["explanation"]


def test_recommend_rules_out_funders_for_clear_reasons(client, candidates):
    items = client.post("/recommend", json={"profile": startup_profile(), "candidates": candidates}, headers=KEY).json()
    by_name = {c["mandate_text"][:20]: i for c, i in zip(candidates, items)}
    savanna = next(i for k, i in by_name.items() if k.startswith("A group of angel"))
    rift = next(i for k, i in by_name.items() if k.startswith("A venture fund"))
    assert savanna["band"] != "not_a_fit"
    # Rift's minimum ticket is KSh 10M; she needs KSh 1M.
    assert rift["band"] == "not_a_fit"
    assert any(s["signal"] == "amount" and not s["fits"] for s in rift["signals"])


def test_sme_profiles_are_not_checked_on_stage(client, candidates):
    profile = startup_profile(journey_type="sme", stage=None, instruments=[], sector="retail",
                              description="Salon in Mombasa", county="Mombasa", funding_amount_kes=150_000)
    items = client.post("/recommend", json={"profile": profile, "candidates": candidates}, headers=KEY).json()
    assert all(s["signal"] != "stage" for i in items for s in i["signals"])


@pytest.mark.parametrize(
    "text, expected",
    [
        ("Nina salon Mombasa, nataka 150k ya stock",
         {"journey_type": "sme", "sector": "retail", "county": "Mombasa", "funding_amount_kes": 150_000}),
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
    assert "funding_amount_kes" in fields or "funding_amount_kes" not in expected


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
