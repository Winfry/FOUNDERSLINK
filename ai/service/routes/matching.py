from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ai.explanations.messages import language_of
from ai.extraction.profile_extractor import extract_profile
from ai.matching.people import recommend_people
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


class PeopleRequest(BaseModel):
    kind: Literal["cofounder", "expert"]
    # The founder looking: sector, county, description, skills,
    # skills_wanted (co-founders) and commitment.
    seeker: dict[str, Any] = {}
    # What they need help with, in their own words (experts).
    need: str = ""
    candidates: list[dict[str, Any]] = Field(default_factory=list, max_length=500)
    language: str | None = "en"


@router.post("/recommend-people")
def recommend_people_route(body: PeopleRequest, request: Request) -> list[RecommendItem]:
    """Co-founders or experts for a founder, with the same answer shape as /recommend."""
    for c in body.candidates:
        if "id" not in c:
            raise HTTPException(status_code=422, detail="every candidate needs an id")
    return recommend_people(body.kind, body.seeker, body.need, body.candidates,
                            language_of(body.language), request.app.state.embedder)


@router.post("/explain-fit")
def explain(body: ExplainFitRequest, request: Request) -> FitExplanation:
    return explain_fit(
        body.profile,
        body.candidate,
        body.track_record,
        language_of(body.language),
        request.app.state.embedder,
    )
