# Ask Compliance with an LLM: the instructions it is given, and what
# happens to its reply. No real LLM is called; the fake one replies the way
# the instructions ask, or breaks them, and the checks must catch it.
# Run: python -m pytest ai/tests

from ai.compliance_rag.answer import PROMPT_FILE, answer_question, build_prompt
from ai.compliance_rag.retrieve import Passage, Retrieval
from ai.service.env_file import load_env_file

KRA = Passage(
    id="kra-1", text="Every company must register for a KRA PIN on iTax before it starts trading. Registration is free.",
    source_id="kra_pin", source_title="How to register for a KRA PIN (non-individual)", section="",
    page=None, url="https://www.kra.go.ke/pin", institution="Kenya Revenue Authority", regulator="KRA",
    last_verified_at="2026-10-04", jurisdiction_level="national", county="", doc_type="source",
    score=1.0, similarity=0.9,
)


class FakeRetriever:
    def search(self, question, profile, k=8, today=None):
        return Retrieval([KRA], 0.9, True, None, "not_needed", [], 0)


class FakeLLM:
    def __init__(self, reply):
        self.reply = reply
        self.system = None

    def complete(self, system, user):
        self.system = system
        return self.reply


def ask(reply, language="en"):
    llm = FakeLLM(reply)
    return answer_question("Do I need a KRA PIN?", language, None, FakeRetriever(), llm), llm


def test_the_instructions_are_written():
    # An empty file meant no answer could ever be confident.
    text = PROMPT_FILE.read_text(encoding="utf-8")
    for rule in ("[1]", "NOT_FOUND", "EXPERT: yes", "EXPERT: no", "{language_name}"):
        assert rule in text, f"the instructions must mention {rule}"


def test_the_instructions_name_the_language():
    system, user = build_prompt("Je, ninahitaji KRA PIN?", "sw", [KRA],
                                Retrieval([KRA], 0.9, True, None, "not_needed", [], 0))
    assert "Kiswahili" in system and "{language_name}" not in system
    assert "[1] How to register for a KRA PIN" in user


def test_a_cited_reply_is_a_confident_answer_with_its_source():
    result, llm = ask("Yes. Every company must register for a KRA PIN on iTax before it starts trading [1].\nEXPERT: no")
    assert llm.system and "NOT_FOUND" in llm.system
    assert result.confident is True
    assert result.answer == "Yes. Every company must register for a KRA PIN on iTax before it starts trading [1]."
    assert [c.url for c in result.citations] == ["https://www.kra.go.ke/pin"]
    assert result.citations[0].last_verified == "2026-10-04"
    assert result.suggest_expert is False


def test_the_llm_can_ask_for_an_expert():
    result, _ = ask("It depends on your business [1].\nEXPERT: yes")
    assert result.confident is True and result.suggest_expert is True


def test_a_reply_without_citations_is_not_shown():
    result, _ = ask("Yes, you need one.\nEXPERT: no")
    assert result.confident is False and result.citations == []


def test_a_number_the_source_does_not_give_is_not_shown():
    result, _ = ask("Yes, and it costs KSh 1,000 [1].\nEXPERT: no")
    assert result.confident is False and "1,000" not in result.answer


def test_not_found_is_an_honest_no():
    result, _ = ask("NOT_FOUND")
    assert result.confident is False and result.suggest_expert is True


def test_settings_come_from_the_env_file(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text('# comment\nFL_TEST_A=one\nFL_TEST_B="two words"\nFL_TEST_C=three  # note\nFL_TEST_EMPTY=\n'
                   "export FL_TEST_D=four\nFL_TEST_SET=from-file\n", encoding="utf-8")
    for k in ("FL_TEST_A", "FL_TEST_B", "FL_TEST_C", "FL_TEST_D", "FL_TEST_EMPTY"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("FL_TEST_SET", "from-environment")
    loaded = load_env_file(env)
    import os
    assert os.environ["FL_TEST_A"] == "one"
    assert os.environ["FL_TEST_B"] == "two words"
    assert os.environ["FL_TEST_C"] == "three"
    assert os.environ["FL_TEST_D"] == "four"
    assert "FL_TEST_EMPTY" not in os.environ, "a blank in the template is not a setting"
    assert os.environ["FL_TEST_SET"] == "from-environment", "the real environment wins"
    assert "FL_TEST_SET" not in loaded
    for k in ("FL_TEST_A", "FL_TEST_B", "FL_TEST_C", "FL_TEST_D"):
        monkeypatch.delenv(k, raising=False)


def test_none_reads_no_file(tmp_path):
    env = tmp_path / ".env"
    env.write_text("FL_TEST_NEVER=x\n", encoding="utf-8")
    assert load_env_file("none") == []
