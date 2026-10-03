from fastapi import APIRouter, Depends, Request

from ai.explanations.messages import language_of
from ai.extraction.profile_extractor import extract_profile
from ai.matching.pipeline import explain_fit, recommend
from ai.service.auth import require_api_key
from ai.service.schemas import (
    ExplainFitRequest,
    ExtractRequest,
    FitExplanation,
    RecommendItem,
    RecommendRequest,
)

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/extract-profile")
def extract(body: ExtractRequest) -> dict:
    return extract_profile(body.free_text, body.language)


@router.post("/recommend")
def recommend_funders(body: RecommendRequest, request: Request) -> list[RecommendItem]:
    return recommend(body.profile, body.candidates, request.app.state.embedder)


@router.post("/explain-fit")
def explain(body: ExplainFitRequest, request: Request) -> FitExplanation:
    return explain_fit(
        body.profile,
        body.candidate,
        body.track_record,
        language_of(body.language),
        request.app.state.embedder,
    )
