# Vetting risk signals. Shape matches backend/src/ai/client.ts (riskSchema):
# request { application: {...} }, answer { risk_level, signals }.

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ai.service.auth import require_api_key
from ai.vetting.risk_signals import assess

router = APIRouter(dependencies=[Depends(require_api_key)])


class Application(BaseModel):
    role: str
    statement: str | None = Field(default=None, max_length=10_000)
    bio: str | None = Field(default=None, max_length=10_000)
    organisation_name: str | None = None
    organisation_website: str | None = None
    email_domain: str = ""


class RiskRequest(BaseModel):
    application: Application


class RiskResponse(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    signals: list[str]


@router.post("/vetting/risk-signals")
def risk_signals(body: RiskRequest) -> RiskResponse:
    return RiskResponse(**assess(body.application.model_dump()))
