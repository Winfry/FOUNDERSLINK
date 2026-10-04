# Compliance endpoints: connect the rules engine and Ask Compliance in
# ai/compliance_rag/ to the service. Shapes match backend/src/ai/client.ts
# (applicableSchema, answerSchema).
#
# Ask Compliance is RAG: retrieval (ai/compliance_rag/retrieve.py) finds the
# official passages, then an LLM writes the answer from them (answer.py).
# With no LLM set up, the best passage is quoted word for word instead.
# When nothing can be said here (no index, or the LLM fails), the service
# answers 503 and the backend uses its own stand-in. It never makes up an answer.

import logging
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ai.compliance_rag.answer import (
    MAX_PASSAGES, MESSAGES, AnswerUnavailable, Citation, ComplianceAnswer, answer_question,
)
from ai.compliance_rag.retrieve import expand, tokenize
from ai.compliance_rag.rules_engine import applicable_items
from ai.explanations.messages import language_of
from ai.service.auth import require_api_key

log = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_api_key)])


class ApplicableRequest(BaseModel):
    profile: dict[str, Any] = {}
    scope: str = "business"
    deal_type: str | None = None
    items: list[dict[str, Any]] = []


class ApplicableResponse(BaseModel):
    item_ids: list[str]


class AnswerRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    language: str | None = "en"
    profile: dict[str, Any] | None = None


class CitationOut(BaseModel):
    source: str
    url: str
    last_verified: str | None


class AnswerResponse(BaseModel):
    answer: str
    citations: list[CitationOut]
    confident: bool
    suggest_expert: bool


@router.post("/compliance/applicable")
def applicable(body: ApplicableRequest) -> ApplicableResponse:
    result = applicable_items(body.profile, body.items, body.scope, body.deal_type)
    return ApplicableResponse(item_ids=result["item_ids"])


QUOTE_CHARS = 450

# The closest passage must be at least this similar before it is quoted.
# Measured on 4 October against the built index with multilingual-e5-small:
# 12 real compliance questions (English and Swahili) scored 0.815-0.913;
# 10 off-topic questions ("best football team in Kenya", "nipe mapishi ya
# chapati") scored 0.739-0.802. The retriever's own threshold (0.80) lets
# some off-topic questions through, which is fine when an LLM reads the
# passages but not when they are quoted directly. Re-measure when sources
# or the model change.
QUOTE_MIN_SIMILARITY = 0.81

QUOTE_TEXT = {
    "en": ('From "{source}": "{excerpt}"\n\nThis is quoted word for word from the official source. '
           "A verified expert can explain how it applies to your business."),
    "sw": ('Kutoka "{source}": "{excerpt}"\n\nHili limenukuliwa neno kwa neno kutoka chanzo rasmi (kwa Kiingereza). '
           "Mtaalamu aliyethibitishwa anaweza kukueleza jinsi linavyohusu biashara yako."),
}


# The sources are in English, so a Swahili question shares no words with
# them and the meaning model alone picks the passage, which went wrong
# ("Nitasajili biashara yangu vipi?" found a Companies Act section on
# foreign companies). The English words are added to the question for the
# search; the answer is still given in the asker's language.
SWAHILI_TERMS = {
    r"\b(?:ku|ni|u|a|tu|m|wa)?(?:ta|na|li)?sajili|usajili": "register registration",
    r"\bjina la biashara": "business name",
    r"\bbiashara": "business",
    r"\bkampuni": "company",
    r"\bkodi|\bushuru": "tax",
    r"ongezeko la thamani": "VAT value added tax",
    r"\bleseni|\bkibali|\bvibali": "licence permit",
    r"\bm?(?:fanya|wa)kazi|\bkuajiri|\bmwajiri|\bwaajiri": "employees employer",
    r"\bmshahara|\bmishahara": "salary payroll PAYE",
    r"(?:data|taarifa) (?:binafsi|za kibinafsi)": "personal data protection",
    r"\bkaunti": "county",
    r"\bmkataba|\bmikataba|\bmakubaliano": "agreement contract",
    r"\bhisa\b": "shares shareholders",
    r"\b(?:m|w)?(?:a)?wekezaji|\buwekezaji": "investor investment",
    r"\bbima\b": "insurance",
    r"\bankara|\brisiti": "invoice receipt eTIMS",
    r"\bada\b": "fee",
    r"\bfaini|\badhabu": "penalty",
    r"\bchakula": "food",
    r"\bafya\b": "health",
}


def with_english_terms(question: str) -> str:
    lower = question.lower()
    extra = [words for pattern, words in SWAHILI_TERMS.items() if re.search(pattern, lower)]
    return f"{question} ({' '.join(extra)})" if extra else question


def _excerpt(text: str, title: str = "") -> str:
    """Whole sentences from the start of the passage, up to QUOTE_CHARS,
    without the document title that ingest puts in front of each piece."""
    text = re.sub(r"\s+", " ", text).strip()
    if title and text.lower().startswith(title.lower()):
        text = text[len(title):].lstrip(" :-|,")
    if len(text) <= QUOTE_CHARS:
        return text
    cut = text[:QUOTE_CHARS]
    end = max(cut.rfind(". "), cut.rfind("; "))
    return (cut[: end + 1] if end > QUOTE_CHARS // 3 else cut.rsplit(" ", 1)[0]) + " ..."


def _rarest_known_word(question: str, retriever) -> str | None:
    """The question word that appears in the fewest pieces of the index, among
    the words that appear in it at all. None when no word is in the index."""
    bm25 = getattr(retriever, "bm25", None)
    if bm25 is None:
        return None
    known = [w for w in set(tokenize(expand(question))) if bm25.idf.get(w, 0) > 0]
    return max(known, key=lambda w: bm25.idf[w]) if known else None


def quoted_answer(question: str, language: str | None, profile: dict | None, retriever) -> ComplianceAnswer | None:
    """The answer when no LLM is set up: the best passage, quoted with its
    citation. Nothing is paraphrased, so nothing can be made up. Not marked
    confident, because a quote may not fully answer the question; an expert
    is offered instead."""
    lang = language_of(language)
    retrieval = retriever.search(question, profile, k=MAX_PASSAGES)
    if not retrieval.relevant or not retrieval.passages:
        return None
    # Without similarities (no embedding model) there is no measured way to
    # tell a close passage from a loose one, so nothing is quoted.
    close = [p for p in retrieval.passages if p.similarity is not None and p.similarity >= QUOTE_MIN_SIMILARITY and p.url]
    # When the question shares words with the sources, the quoted passage must
    # contain the rarest of them ("housing" in "What is the housing levy?").
    # A Swahili question shares none with English sources, so meaning decides.
    key = _rarest_known_word(question, retriever)
    if key:
        close = [p for p in close if key in set(tokenize(p.text))]
    if not close:
        return None
    # Among those, the retriever's own ranking (words and meaning together):
    # measured on 12 questions in both languages, it is right at least as
    # often as meaning alone, and it fixed "Je, ninahitaji KRA PIN kwa
    # kampuni yangu?", which meaning alone sent to a data-protection note.
    best = max(close, key=lambda p: p.score)
    source = f"{best.source_title}, {best.section}" if best.section else best.source_title
    return ComplianceAnswer(
        answer=QUOTE_TEXT[lang].format(source=source, excerpt=_excerpt(best.text, best.source_title)),
        citations=[Citation(best.institution or best.source_title, best.url, best.last_verified_at or None)],
        confident=False,
        suggest_expert=True,
        reason="quoted (no LLM configured)",
    )


@router.post("/compliance/answer")
def answer(body: AnswerRequest, request: Request) -> AnswerResponse:
    state = request.app.state
    retriever = getattr(state, "compliance_retriever", None)
    llm = getattr(state, "llm", None)
    question = with_english_terms(body.question)
    try:
        result = answer_question(question, body.language, body.profile, retriever, llm)
    except AnswerUnavailable as e:
        if retriever is None:
            log.info("Ask Compliance left to the backend's stand-in: %s", e)
            raise HTTPException(status_code=503, detail=f"Ask Compliance unavailable: {e}")
        # Retrieval worked but no LLM wrote the answer (none set up, or it
        # failed or timed out): quote the source, or say it isn't there.
        lang = language_of(body.language)
        result = quoted_answer(question, body.language, body.profile, retriever) or ComplianceAnswer(
            MESSAGES["not_found"][lang], [], False, True, "nothing close enough to quote")
    return AnswerResponse(**result.to_dict())
