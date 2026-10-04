# The compliance endpoints, wired to ai/compliance_rag/. These test the
# wiring and the contract with the backend; the rules engine and the
# answer pipeline themselves belong to ai/compliance_rag/.
# Run: python -m pytest ai/tests

from ai.compliance_rag.answer import Citation, ComplianceAnswer
from ai.service.main import app
from ai.tests.conftest import KEY

ITEMS = [
    {"id": "kra_pin", "scope": "business", "deal_type": None, "applies_when": None},
    {"id": "employer_registrations", "scope": "business", "deal_type": None, "applies_when": {"has_employees": True}},
    {"id": "county_business_permit", "scope": "business", "deal_type": None,
     "applies_when": {"counties": ["Nairobi", "Mombasa"]}},
    {"id": "deal_investment_term_sheet", "scope": "deal", "deal_type": "investment", "applies_when": None},
    {"id": "deal_cofounder_agreement", "scope": "deal", "deal_type": "cofounder_partnership", "applies_when": None},
]


def applicable(client, profile, scope="business", deal_type=None, items=ITEMS):
    res = client.post("/compliance/applicable", headers=KEY,
                      json={"profile": profile, "scope": scope, "deal_type": deal_type, "items": items})
    assert res.status_code == 200, res.text
    return res.json()


def test_applicable_returns_only_item_ids(client):
    out = applicable(client, {"county": "Nairobi", "has_employees": True})
    assert out == {"item_ids": ["kra_pin", "employer_registrations", "county_business_permit"]}


def test_an_unanswered_yes_no_question_does_not_apply_the_item(client):
    out = applicable(client, {"county": "Kisumu", "has_employees": None})
    assert out == {"item_ids": ["kra_pin"]}


def test_a_deal_checklist_has_only_its_deal_type(client):
    out = applicable(client, {}, scope="deal", deal_type="investment")
    assert out == {"item_ids": ["deal_investment_term_sheet"]}


def test_only_ids_that_were_sent_come_back(client):
    out = applicable(client, {}, items=[{"id": "only_this", "scope": "business"}])
    assert out == {"item_ids": ["only_this"]}


def test_answer_is_503_when_the_index_is_not_built(client):
    # The backend then answers with its own stand-in.
    app.state.compliance_retriever = None
    res = client.post("/compliance/answer", json={"question": "Do I need a KRA PIN?", "language": "en"}, headers=KEY)
    assert res.status_code == 503


def test_answer_returns_the_backend_shape(client, monkeypatch):
    from ai.service.routes import compliance as route

    def fake_answer(question, language, profile, retriever, llm):
        return ComplianceAnswer("A company needs its own KRA PIN [1].",
                                [Citation("Kenya Revenue Authority", "https://www.kra.go.ke/", "2026-10-04")],
                                True, False, "answered")

    monkeypatch.setattr(route, "answer_question", fake_answer)
    res = client.post("/compliance/answer", json={"question": "Do I need a KRA PIN?", "language": "en",
                                                  "profile": None}, headers=KEY)
    assert res.status_code == 200
    assert res.json() == {
        "answer": "A company needs its own KRA PIN [1].",
        "citations": [{"source": "Kenya Revenue Authority", "url": "https://www.kra.go.ke/", "last_verified": "2026-10-04"}],
        "confident": True,
        "suggest_expert": False,
    }


def test_compliance_endpoints_require_the_key(client):
    assert client.post("/compliance/applicable", json={"items": []}).status_code == 401
    assert client.post("/compliance/answer", json={"question": "x"}).status_code == 401


def test_health_reports_what_is_loaded(client):
    body = client.get("/health").json()
    assert {"status", "embedding_model", "compliance_index", "llm"} <= set(body)
