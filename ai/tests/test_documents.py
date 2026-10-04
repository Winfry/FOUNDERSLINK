# /documents/precheck and /deals/due-diligence-pack (TEAM_DECISIONS D12).
# Run: python -m pytest ai/tests

import base64
from datetime import date

from ai.documents import samples
from ai.documents.precheck import precheck
from ai.tests.conftest import KEY

PROFILE = {"business_name": "Afya Booking Ltd", "county": "Nairobi"}
TODAY = date(2026, 10, 4)


def checks_of(result):
    return {c["check"]: c["passed"] for c in result["checks"]}


def call_precheck(client, data, document_type="kra_pin_certificate", mime="application/pdf", profile=PROFILE):
    body = {"document_type": document_type, "file_base64": base64.b64encode(data).decode(),
            "mime_type": mime, "profile": profile, "external_model_allowed": False}
    res = client.post("/documents/precheck", json=body, headers=KEY)
    assert res.status_code == 200, res.text
    return res.json()


# --- Pre-check

def test_a_clean_kra_pin_certificate_passes_every_check():
    result = precheck("kra_pin_certificate", samples.kra_pin_certificate(), "application/pdf", PROFILE, TODAY)
    assert result["readable"] is True
    assert result["fields"]["kra_pin"] == "P051234567X"
    assert result["fields"]["business_name"] == "Afya Booking Ltd"
    assert result["fields"]["issued_on"] == "2025-03-15"
    assert all(checks_of(result).values()), result
    assert result["concerns"] == []


def test_a_clean_business_registration_passes_every_check():
    result = precheck("business_registration", samples.business_registration(), "application/pdf", PROFILE, TODAY)
    assert result["fields"]["registration_number"] == "PVT-DEMO1234"
    assert all(checks_of(result).values()), result


def test_a_name_that_does_not_match_the_profile_is_flagged():
    data = samples.kra_pin_certificate(name="Mavuno Traders")
    result = precheck("kra_pin_certificate", data, "application/pdf", PROFILE, TODAY)
    assert checks_of(result)["name_matches_profile"] is False
    assert any("Mavuno Traders" in c for c in result["concerns"])


def test_small_differences_in_the_name_still_match():
    data = samples.kra_pin_certificate(name="AFYA BOOKING LIMITED")
    result = precheck("kra_pin_certificate", data, "application/pdf", PROFILE, TODAY)
    assert checks_of(result)["name_matches_profile"] is True


def test_a_badly_formed_pin_is_flagged():
    result = precheck("kra_pin_certificate", samples.kra_pin_certificate(pin="P05123X"), "application/pdf", PROFILE, TODAY)
    assert checks_of(result)["pin_format_valid"] is False
    assert result["fields"]["kra_pin"] is None


def test_the_wrong_kind_of_document_is_flagged():
    result = precheck("business_registration", samples.kra_pin_certificate(), "application/pdf", PROFILE, TODAY)
    assert checks_of(result)["document_type_matches"] is False


def test_a_future_date_is_flagged():
    data = samples.kra_pin_certificate(dated="01/01/2030")
    result = precheck("kra_pin_certificate", data, "application/pdf", PROFILE, TODAY)
    assert checks_of(result)["dates_not_in_future"] is False


def test_a_pdf_saved_with_an_editing_tool_is_flagged():
    data = samples.kra_pin_certificate(producer="iLovePDF")
    result = precheck("kra_pin_certificate", data, "application/pdf", PROFILE, TODAY)
    assert checks_of(result)["not_edited"] is False
    assert any("original" in c for c in result["concerns"])


def test_a_scan_with_no_text_is_unreadable_not_guessed():
    result = precheck("kra_pin_certificate", samples.make_pdf([""]), "application/pdf", PROFILE, TODAY)
    assert result["readable"] is False
    assert result["fields"] == {}
    assert "admin" in result["concerns"][0]


def test_a_photo_is_unreadable_without_ocr():
    result = precheck("kra_pin_certificate", b"\xff\xd8\xff not really a jpeg", "image/jpeg", PROFILE, TODAY)
    assert result["readable"] is False


def test_a_broken_file_is_unreadable():
    result = precheck("kra_pin_certificate", b"%PDF-1.4 garbage", "application/pdf", PROFILE, TODAY)
    assert result["readable"] is False


def test_no_profile_name_skips_the_name_check():
    result = precheck("kra_pin_certificate", samples.kra_pin_certificate(), "application/pdf", {}, TODAY)
    assert "name_matches_profile" not in checks_of(result)


def test_precheck_endpoint_shape(client):
    out = call_precheck(client, samples.kra_pin_certificate())
    assert set(out) == {"fields", "checks", "concerns", "readable"}
    assert all(set(c) <= {"check", "passed", "note"} for c in out["checks"])
    assert all(v is None or isinstance(v, str) for v in out["fields"].values())


def test_precheck_rejects_bad_base64(client):
    body = {"document_type": "kra_pin_certificate", "file_base64": "not base64!!", "mime_type": "application/pdf"}
    assert client.post("/documents/precheck", json=body, headers=KEY).status_code == 400


def test_precheck_requires_the_key(client):
    body = {"document_type": "kra_pin_certificate", "file_base64": "", "mime_type": "application/pdf"}
    assert client.post("/documents/precheck", json=body).status_code == 401


# --- Due-diligence pack

def party(role, documents, required=None, checks=None):
    return {
        "role": role,
        "profile": {"business_name": "Afya Booking Ltd"},
        "checks": checks if checks is not None else ["Phone verified", "Approved by FounderLink"],
        "required": required or [],
        "documents": documents,
    }


KRA = {"type": "kra_pin_certificate", "title": "KRA PIN certificate"}
BRS = {"type": "business_registration", "title": "Business registration"}
ORG = {"type": "organisation_proof", "title": "Proof of organisation"}
DEAL = {"type": "investment", "stage": "due_diligence", "terms": {"amount_kes": 1_000_000}}


def call_pack(client, parties, language="en"):
    res = client.post("/deals/due-diligence-pack", json={"deal": DEAL, "parties": parties, "language": language}, headers=KEY)
    assert res.status_code == 200, res.text
    return res.json()


def test_pack_returns_every_party_in_order(client):
    parties = [party("founder", [], [KRA]), party("investor", [], [ORG]), party("expert", [])]
    out = call_pack(client, parties)
    assert [p["role"] for p in out["parties"]] == ["founder", "investor", "expert"]
    assert set(out["parties"][0]) == {"role", "verified", "self_reported", "missing"}


def test_pack_sorts_documents_into_verified_waiting_and_missing(client):
    clean = precheck("kra_pin_certificate", samples.kra_pin_certificate(), "application/pdf", PROFILE, TODAY)
    founder = party("founder", [
        {**BRS, "status": "verified", "precheck": None},
        {**KRA, "status": "uploaded", "precheck": clean},
    ], required=[BRS, KRA])
    investor = party("investor", [], required=[ORG])
    out = call_pack(client, [founder, investor])

    f, i = out["parties"]
    assert "Business registration: confirmed by FounderLink" in f["verified"]
    assert "Phone verified" in f["verified"]
    assert any("KRA PIN certificate: uploaded, AI pre-check found no concerns" in s for s in f["self_reported"])
    assert f["missing"] == []
    assert i["missing"] == ["Proof of organisation"]
    assert out["summary"] == ("Investment deal at due diligence. 1 document still missing before terms can be agreed. "
                              "1 document waiting for FounderLink to confirm.")


def test_pack_surfaces_ai_concerns(client):
    flagged = precheck("kra_pin_certificate", samples.kra_pin_certificate(name="Mavuno Traders"),
                       "application/pdf", PROFILE, TODAY)
    out = call_pack(client, [party("founder", [{**KRA, "status": "uploaded", "precheck": flagged}], [KRA])])
    line = next(s for s in out["parties"][0]["self_reported"] if s.startswith("KRA PIN"))
    assert "AI pre-check flagged" in line and "Mavuno Traders" in line
    assert "The AI flagged 1 concern for an admin to look at." in out["summary"]


def test_a_rejected_document_counts_as_missing(client):
    out = call_pack(client, [party("founder", [{**KRA, "status": "rejected", "precheck": None}], [KRA])])
    assert out["parties"][0]["missing"] == ["KRA PIN certificate: not accepted, please share another"]


def test_everything_confirmed_reads_as_ready(client):
    docs = [{**KRA, "status": "verified", "precheck": None}]
    out = call_pack(client, [party("founder", docs, [KRA]), party("investor", [{**ORG, "status": "verified", "precheck": None}], [ORG])])
    assert "Every party has shared and FounderLink has confirmed" in out["summary"]


def test_pack_in_swahili(client):
    out = call_pack(client, [party("founder", [], [KRA])], language="sw")
    assert out["summary"].startswith("Mkataba wa uwekezaji, hatua ya uchunguzi wa kina.")
    assert "Nyaraka 1 bado zinakosekana" in out["summary"]


def test_pack_requires_the_key(client):
    res = client.post("/deals/due-diligence-pack", json={"deal": DEAL, "parties": []})
    assert res.status_code == 401
