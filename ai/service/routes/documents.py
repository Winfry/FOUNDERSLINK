# Document pre-checks and the due-diligence pack (TEAM_DECISIONS D12).
# Shapes match backend/src/ai/client.ts: precheckSchema and packSchema.

import base64
import binascii
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ai.documents.pack import build_pack
from ai.documents.precheck import precheck
from ai.service.auth import require_api_key

router = APIRouter(dependencies=[Depends(require_api_key)])

# The backend accepts uploads up to 5 MB; base64 adds about a third.
MAX_BASE64 = 8 * 1024 * 1024


class PrecheckProfile(BaseModel):
    business_name: str | None = None
    county: str | None = None


class PrecheckRequest(BaseModel):
    document_type: str
    file_base64: str = Field(max_length=MAX_BASE64)
    mime_type: str
    profile: PrecheckProfile = PrecheckProfile()
    # Her `document_processing` consent. No outside model is used yet, so
    # the file never leaves this service either way.
    external_model_allowed: bool = False


class Check(BaseModel):
    check: str
    passed: bool
    note: str | None = None


class PrecheckResponse(BaseModel):
    fields: dict[str, str | None]
    checks: list[Check]
    concerns: list[str]
    readable: bool


class PackRequest(BaseModel):
    deal: dict[str, Any]
    parties: list[dict[str, Any]]
    language: str | None = "en"


class PackParty(BaseModel):
    role: str
    verified: list[str]
    self_reported: list[str]
    missing: list[str]


class PackResponse(BaseModel):
    parties: list[PackParty]
    summary: str


@router.post("/documents/precheck")
def precheck_document(body: PrecheckRequest) -> PrecheckResponse:
    try:
        data = base64.b64decode(body.file_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="file_base64 is not valid base64")
    return PrecheckResponse(**precheck(body.document_type, data, body.mime_type, body.profile.model_dump()))


@router.post("/deals/due-diligence-pack")
def due_diligence_pack(body: PackRequest) -> PackResponse:
    return PackResponse(**build_pack(body.deal, body.parties, body.language or "en"))
