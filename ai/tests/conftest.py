# Shared test setup. Tests run without the embedding model and use the
# backend's demo funders, so both sides test against the same data.

import json
import os
from pathlib import Path

os.environ["EMBEDDING_MODEL"] = "none"
os.environ["AI_SERVICE_API_KEY"] = "test-key"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from ai.service.main import app  # noqa: E402

KEY = {"x-internal-api-key": "test-key"}
FUNDERS = Path(__file__).resolve().parents[2] / "backend" / "data" / "demo-funders.json"
FUNDER_FIELDS = ["kind", "mandate_text", "journey_types", "sectors", "stages", "counties",
                 "instruments", "ticket_min_kes", "ticket_max_kes"]


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def candidates():
    rows = json.loads(FUNDERS.read_text(encoding="utf-8"))
    return [{"id": f"f{i}", "name": row["name"], **{k: row.get(k, []) for k in FUNDER_FIELDS}}
            for i, row in enumerate(rows)]


@pytest.fixture(scope="session")
def funder(candidates):
    """Look a demo funder up by the start of its name."""
    def find(name: str) -> dict:
        row = next(c for c in candidates if c["name"].startswith(name))
        return {k: v for k, v in row.items() if k != "name"}
    return find


@pytest.fixture(scope="session")
def profile():
    """A health-tech startup founder in Nairobi; override any field."""
    def make(**overrides) -> dict:
        return {
            "journey_type": "startup", "business_status": "registered_business_name",
            "description": "A health app that books clinic visits for mothers in Nairobi",
            "sector": "health", "county": "Nairobi", "funding_amount_kes": 1_000_000,
            "use_of_funds": "Hire a backend developer", "stage": "mvp",
            "instruments": ["equity", "grant"], "months_trading": None,
            "monthly_revenue_band": None, "has_employees": None, "handles_personal_data": True,
            **overrides,
        }
    return make
