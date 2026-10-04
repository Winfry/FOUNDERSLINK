# Compliance endpoints: connect the rules engine and Ask Compliance in
# ai/compliance_rag/ to the service. Shapes match backend/src/ai/client.ts
# (applicableSchema, answerSchema).
#
# When an answer cannot be made here (no index built yet, no LLM set up,
# or the LLM fails), the service answers 503 and the backend uses its own
# stand-in, which says so. It never makes up an answer.

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ai.compliance_rag.answer import AnswerUnavailable, answer_question
from ai.compliance_rag.rules_engine import applicable_items
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


@router.post("/compliance/answer")
def answer(body: AnswerRequest, request: Request) -> AnswerResponse:
    state = request.app.state
    try:
        result = answer_question(body.question, body.language, body.profile,
                                 getattr(state, "compliance_retriever", None), getattr(state, "llm", None))
    except AnswerUnavailable as e:
        log.info("Ask Compliance left to the backend's stand-in: %s", e)
        raise HTTPException(status_code=503, detail=f"Ask Compliance unavailable: {e}")
    return AnswerResponse(**result.to_dict())
