# The scam check on messages. Shape matches backend/src/ai/client.ts
# (moderationSchema): { flagged, reasons }.

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ai.moderation.payment_request_detector import check_message
from ai.service.auth import require_api_key

router = APIRouter(dependencies=[Depends(require_api_key)])


class CheckMessageRequest(BaseModel):
    text: str = Field(max_length=20_000)


class CheckMessageResponse(BaseModel):
    flagged: bool
    reasons: list[str]


@router.post("/moderation/check-message")
def check(body: CheckMessageRequest) -> CheckMessageResponse:
    return CheckMessageResponse(**check_message(body.text))
