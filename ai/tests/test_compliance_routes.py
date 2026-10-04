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


class FakeRetriever:
    """Returns one relevant passage, like the real index does for a KRA question."""

    def __init__(self, relevant=True, url="https://www.kra.go.ke/business/companies-partnerships", similarity=0.88):
        from ai.compliance_rag.retrieve import Passage, Retrieval
        passage = Passage(
            id="kra_pin:1", text="Every company must register for a KRA PIN. " * 30, source_id="kra_pin",
            source_title="How to register for a KRA PIN", section="", page=None, url=url,
            institution="Kenya Revenue Authority", regulator="KRA", last_verified_at="2026-10-04",
            jurisdiction_level="national", county="", doc_type="source", score=0.1, similarity=similarity,
        )
        self.retrieval = Retrieval([passage], similarity, relevant, None, "not_needed", [], 0)

    def search(self, question, profile=None, k=6, today=None):
        return self.retrieval


def ask(client, question="Do I need a KRA PIN?", language="en"):
    return client.post("/compliance/answer", json={"question": question, "language": language, "profile": None},
                       headers=KEY)


def test_without_an_llm_the_best_source_is_quoted(client):
    app.state.compliance_retriever, app.state.llm = FakeRetriever(), None
    res = ask(client)
    assert res.status_code == 200
    body = res.json()
    assert body["answer"].startswith('From "How to register for a KRA PIN": "Every company must register')
    assert "quoted word for word" in body["answer"]
    assert len(body["answer"]) < 700
    assert body["citations"] == [{"source": "Kenya Revenue Authority",
                                  "url": "https://www.kra.go.ke/business/companies-partnerships",
                                  "last_verified": "2026-10-04"}]
    # A quote may not fully answer the question: not confident, an expert is offered.
    assert body["confident"] is False and body["suggest_expert"] is True


def test_quoted_answer_in_swahili(client):
    app.state.compliance_retriever, app.state.llm = FakeRetriever(), None
    body = ask(client, "Je, ninahitaji KRA PIN?", "sw").json()
    assert body["answer"].startswith('Kutoka "How to register for a KRA PIN"')


def test_a_failing_llm_also_falls_back_to_the_quote(client):
    class BrokenLLM:
        def complete(self, system, user):
            raise TimeoutError("took too long")

    app.state.compliance_retriever, app.state.llm = FakeRetriever(), BrokenLLM()
    res = ask(client)
    assert res.status_code == 200 and "quoted word for word" in res.json()["answer"]


def test_nothing_relevant_still_says_it_cannot_confirm(client):
    # Her pipeline's own "not found" reply, not a quote of something unrelated.
    app.state.compliance_retriever, app.state.llm = FakeRetriever(relevant=False), None
    body = ask(client).json()
    assert body["citations"] == [] and body["suggest_expert"] is True
    assert "couldn't find" in body["answer"]


def test_an_off_topic_question_is_not_answered_with_a_quote(client):
    # Measured: off-topic questions reach up to 0.802 similarity; the retriever
    # still calls that "relevant", so the quote has its own, higher bar.
    app.state.compliance_retriever, app.state.llm = FakeRetriever(similarity=0.802), None
    res = ask(client, "What is the best football team in Kenya?")
    assert res.status_code == 200
    body = res.json()
    assert body["citations"] == [] and "couldn't find" in body["answer"]


def test_a_close_passage_without_the_key_word_is_not_quoted(client):
    # The real case: no source mentions "housing levy", and a Finance Act
    # passage about levies scored just above the similarity bar.
    from types import SimpleNamespace
    retriever = FakeRetriever(similarity=0.83)
    retriever.retrieval.passages[0].text = "Amendment of the Second Schedule: every levy on tariff heading 8802."
    retriever.bm25 = SimpleNamespace(idf={"levy": 2.0, "hous": 6.0, "tariff": 5.0})
    app.state.compliance_retriever, app.state.llm = retriever, None
    body = ask(client, "What is the housing levy?").json()
    assert body["citations"] == [] and "couldn't find" in body["answer"]


def test_a_passage_with_the_key_word_is_quoted(client):
    from types import SimpleNamespace
    retriever = FakeRetriever(similarity=0.83)
    retriever.bm25 = SimpleNamespace(idf={"kra": 4.0, "pin": 3.0, "company": 1.0})
    app.state.compliance_retriever, app.state.llm = retriever, None
    assert ask(client).json()["citations"]


def test_the_quote_drops_the_repeated_title(client):
    app.state.compliance_retriever, app.state.llm = FakeRetriever(), None
    retriever = app.state.compliance_retriever
    retriever.retrieval.passages[0].text = "How to register for a KRA PIN Step 1: open the iTax portal."
    body = ask(client).json()
    assert '"Step 1: open the iTax portal."' in body["answer"]


def test_a_swahili_question_is_searched_with_english_words_too():
    from ai.service.routes.compliance import with_english_terms
    assert with_english_terms("Nitasajili biashara yangu vipi?") == \
        "Nitasajili biashara yangu vipi? (register registration business)"
    assert "tax" in with_english_terms("Je, nilipe kodi?")
    assert with_english_terms("Do I need a KRA PIN?") == "Do I need a KRA PIN?"


def test_compliance_endpoints_require_the_key(client):
    assert client.post("/compliance/applicable", json={"items": []}).status_code == 401
    assert client.post("/compliance/answer", json={"question": "x"}).status_code == 401


def test_health_reports_what_is_loaded(client):
    body = client.get("/health").json()
    assert {"status", "embedding_model", "compliance_index", "llm"} <= set(body)
