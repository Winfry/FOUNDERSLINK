# /explain-fit: the fit behind one investor profile page (TEAM_DECISIONS D6,
# docs/FUNDING_FLOW.md section 4.3). Run: python -m pytest ai/tests

import pytest

from ai.matching.pipeline import explain_fit
from ai.service.schemas import Candidate, MatchProfile, TrackRecordItem
from ai.tests.conftest import KEY

BANDS = {"strong", "good", "possible", "not_a_fit"}


def call(client, profile, candidate, track=(), language="en"):
    body = {"profile": profile, "candidate": candidate, "track_record": list(track), "language": language}
    res = client.post("/explain-fit", json=body, headers=KEY)
    assert res.status_code == 200, res.text
    return res.json()


def item(sector, stage=None, source="public"):
    return {"sector": sector, "stage": stage, "source": source}


# --- The contract the backend checks (backend/src/ai/client.ts, explainSchema)

def test_requires_the_key(client, profile, funder):
    body = {"profile": profile(), "candidate": funder("Savanna"), "track_record": [], "language": "en"}
    assert client.post("/explain-fit", json=body).status_code == 401


def test_answers_in_the_shape_the_backend_expects(client, profile, funder):
    out = call(client, profile(), funder("Savanna"), [item("health", "mvp")])
    assert set(out) == {"band", "components", "reasons", "track_record_highlights"}
    assert out["band"] in BANDS
    assert all(set(c) == {"signal", "fits", "text"} for c in out["components"])
    assert out["reasons"] and all(isinstance(r, str) and r for r in out["reasons"])
    assert all(isinstance(h, str) and h for h in out["track_record_highlights"])


def test_unknown_language_falls_back_to_english(client, profile, funder):
    out = call(client, profile(), funder("Savanna"), language="fr")
    assert out["reasons"][0].startswith("A ")


def test_track_record_is_optional(client, profile, funder):
    body = {"profile": profile(), "candidate": funder("Savanna")}
    res = client.post("/explain-fit", json=body, headers=KEY)
    assert res.status_code == 200
    assert res.json()["track_record_highlights"] == []


# --- The profile page must agree with the match card

PROFILES = {
    "startup": {},
    "startup without amount or stage": {"funding_amount_kes": None, "stage": None},
    "sme": {"journey_type": "sme", "stage": None, "instruments": [], "sector": "retail",
            "description": "Salon in Mombasa", "county": "Mombasa", "funding_amount_kes": 150_000},
}


@pytest.mark.parametrize("name", PROFILES)
def test_band_and_components_match_recommend(client, profile, candidates, name):
    p = profile(**PROFILES[name])
    cards = client.post("/recommend", json={"profile": p, "candidates": candidates}, headers=KEY).json()
    for candidate, card in zip(candidates, cards):
        page = call(client, p, candidate)
        assert page["band"] == card["band"], candidate["name"]
        assert page["components"] == card["signals"], candidate["name"]


@pytest.mark.parametrize("name", PROFILES)
def test_band_does_not_depend_on_language(client, profile, candidates, name):
    p = profile(**PROFILES[name])
    for candidate in candidates:
        assert call(client, p, candidate, language="en")["band"] == call(client, p, candidate, language="sw")["band"]


# --- Reasons

def test_strong_fit_reasons(client, profile, funder):
    out = call(client, profile(), funder("Savanna"))
    assert out["band"] == "strong"
    assert out["reasons"][0] == "A strong fit: everything we checked lines up."
    # Most useful first: the amount leads.
    assert out["reasons"][1].startswith("Why it fits: your KSh 1,000,000 is within their range")


def test_not_a_fit_says_exactly_why(client, profile, funder):
    out = call(client, profile(), funder("Rift"))
    assert out["band"] == "not_a_fit"
    assert out["reasons"] == [
        "Not a fit right now.",
        "Why not: you need KSh 1,000,000; their minimum is KSh 10,000,000; "
        "focuses on fintech, climate and logistics, not health; "
        "funds businesses at these stages: early revenue and growth, not MVP.",
    ]


def test_missing_profile_details_become_actions(client, profile, funder):
    out = call(client, profile(funding_amount_kes=None, stage=None), funder("Savanna"))
    assert out["band"] == "possible"
    assert "Add how much you need to your profile to confirm the amount." in out["reasons"]
    assert "Add your stage to your profile to confirm the stage." in out["reasons"]


def test_a_soft_miss_is_something_to_check(client, profile, funder):
    out = call(client, profile(instruments=["loan"]), funder("Savanna"))
    assert out["band"] == "good"
    assert "Check: offers equity and convertible notes; you asked for loans." in out["reasons"]


def test_partial_mandate_match_is_something_to_check(profile, funder):
    class HalfwayEmbedder:
        def similarities(self, query, passages):
            return [0.80] * len(passages)

    out = explain_fit(MatchProfile(**profile()), Candidate(**funder("Savanna")), [], "en", HalfwayEmbedder())
    assert out.band == "good"
    assert "Check: what you described partly matches what they say they fund." in out.reasons


def test_swahili_reasons_and_components(client, profile, funder):
    out = call(client, profile(), funder("Savanna"), language="sw")
    assert out["reasons"][0] == "Inafaa sana: kila tulichokagua kinalingana."
    texts = " ".join(c["text"] for c in out["components"])
    assert "Wanafadhili biashara za afya" in texts
    assert "Funds" not in texts


# --- Track-record highlights

def test_highlight_names_where_the_evidence_comes_from(client, profile, funder):
    track = [item("health", "mvp", "platform_deal"), item("health", "mvp", "public"), item("agri", "growth")]
    out = call(client, profile(), funder("Savanna"), track)
    assert out["track_record_highlights"][0] == (
        "Has backed 2 health businesses at the MVP stage, like yours "
        "(1 verified on FounderLink, 1 from a public source)"
    )


def test_self_reported_entries_are_worded_as_claims(client, profile, funder):
    out = call(client, profile(), funder("Savanna"), [item("health", None, "self_reported")])
    assert out["track_record_highlights"] == [
        "Says they have backed 1 health business before (self-reported, not confirmed)"
    ]


def test_unknown_sources_count_as_self_reported(client, profile, funder):
    out = call(client, profile(), funder("Savanna"), [item("health", None, "press_release")])
    assert out["track_record_highlights"][0].startswith("Says they have backed")


def test_no_overlap_is_said_plainly(client, profile, funder):
    track = [item("agri", "mvp"), item("fintech", "growth"), item("agri", "early_revenue")]
    out = call(client, profile(), funder("Savanna"), track)
    assert out["track_record_highlights"] == [
        "Has invested at the MVP stage 1 time (1 from a public source)",
        "No health investments on record. Past investments are in agriculture and fintech",
    ]


def test_verified_deals_elsewhere_are_still_mentioned(client, profile, funder):
    track = [item("health", "mvp", "public"), item("agri", "growth", "platform_deal")]
    out = call(client, profile(), funder("Savanna"), track)
    assert out["track_record_highlights"] == [
        "Has backed 1 health business at the MVP stage, like yours (1 from a public source)",
        "Has closed 1 deal on FounderLink",
    ]


def test_sme_highlights_never_mention_stage(client, profile, funder):
    sme = profile(**PROFILES["sme"])
    out = call(client, sme, funder("Savanna"), [item("retail", "mvp", "public")])
    assert out["track_record_highlights"] == ["Has backed 1 retail business before (1 from a public source)"]


def test_at_most_three_highlights(profile, funder):
    track = [TrackRecordItem(**item("agri", "mvp", "platform_deal")) for _ in range(5)]
    out = explain_fit(MatchProfile(**profile()), Candidate(**funder("Savanna")), track, "en", None)
    assert len(out.track_record_highlights) <= 3


def test_swahili_highlight(client, profile, funder):
    track = [item("health", "mvp", "platform_deal"), item("health", "mvp", "public")]
    out = call(client, profile(), funder("Savanna"), track, language="sw")
    assert out["track_record_highlights"][0] == (
        "Wamefadhili biashara 2 za afya katika hatua ya bidhaa ya majaribio, kama yako "
        "(1 zimethibitishwa kwenye FounderLink, 1 kutoka chanzo cha umma)"
    )
