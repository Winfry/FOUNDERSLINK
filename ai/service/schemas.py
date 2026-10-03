# Request and response shapes for the AI service. They mirror the
# backend's contract in docs/FUNDING_FLOW.md section 4 and the checks in
# backend/src/ai/client.ts. Change both sides together.

from typing import Literal

from pydantic import BaseModel, Field

Band = Literal["strong", "good", "possible", "not_a_fit"]


class ExtractRequest(BaseModel):
    free_text: str = Field(min_length=1, max_length=4000)
    language: Literal["en", "sw"] | None = None


class MatchProfile(BaseModel):
    journey_type: str
    business_status: str
    description: str
    sector: str
    county: str
    funding_amount_kes: int | None = None
    use_of_funds: str | None = None
    stage: str | None = None
    instruments: list[str] = []
    months_trading: int | None = None
    monthly_revenue_band: str | None = None
    has_employees: bool | None = None
    handles_personal_data: bool | None = None


class Candidate(BaseModel):
    id: str
    kind: str
    mandate_text: str
    journey_types: list[str] = []
    sectors: list[str] = []
    stages: list[str] = []
    counties: list[str] = []
    instruments: list[str] = []
    ticket_min_kes: int
    ticket_max_kes: int


class RecommendRequest(BaseModel):
    profile: MatchProfile
    candidates: list[Candidate]


class Signal(BaseModel):
    signal: str
    fits: bool
    text: str


class RecommendItem(BaseModel):
    candidate_id: str
    score: float = Field(ge=0, le=1)
    band: Band
    signals: list[Signal]
    explanation: str


class TrackRecordItem(BaseModel):
    """One past investment, as the backend shares it: no company name and
    no amount. `source` is platform_deal, public or self_reported."""

    sector: str
    stage: str | None = None
    source: str = "self_reported"


class ExplainFitRequest(BaseModel):
    profile: MatchProfile
    candidate: Candidate
    track_record: list[TrackRecordItem] = []
    # Free string on purpose: an unknown language falls back to English
    # rather than failing the request.
    language: str | None = "en"


class FitExplanation(BaseModel):
    band: Band
    components: list[Signal]
    reasons: list[str]
    track_record_highlights: list[str]
