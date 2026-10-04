# Vetting risk signals. Run: python -m pytest ai/tests

from ai.tests.conftest import KEY
from ai.vetting.risk_signals import assess

GOOD_STATEMENT = ("Savanna Capital is an angel syndicate in Nairobi. We have backed six health and agriculture "
                  "startups at the MVP stage since 2021, with cheques of KSh 500,000 to 2 million.")


def application(**overrides):
    return {
        "role": "investor", "statement": GOOD_STATEMENT, "bio": None,
        "organisation_name": "Savanna Capital", "organisation_website": "https://www.savannacapital.co.ke",
        "email_domain": "savannacapital.co.ke", **overrides,
    }


def test_a_well_documented_investor_is_low_risk():
    assert assess(application()) == {"risk_level": "low", "signals": []}


def test_the_fake_investor_from_the_demo_is_high_risk():
    out = assess(application(
        statement="We fund any business with no requirements. Pay the processing fee to Till 845123 today only.",
        organisation_website=None, email_domain="mailinator.com",
    ))
    assert out["risk_level"] == "high"
    joined = " | ".join(out["signals"])
    assert "fee" in joined and "disposable email" in joined and "without requirements" in joined
    assert "no organisation website" in joined.lower()


def test_most_serious_signal_comes_first():
    out = assess(application(email_domain="yopmail.com", organisation_website=None))
    assert out["signals"][0].startswith("Signed up with a disposable email")


def test_free_email_for_an_organisation_is_one_medium_signal():
    out = assess(application(email_domain="gmail.com"))
    assert out["risk_level"] == "medium"
    assert out["signals"] == ["Says they represent Savanna Capital but signed up with a free email address "
                              "(gmail.com). Ask for an organisation email"]


def test_email_and_website_from_different_organisations():
    out = assess(application(email_domain="othercompany.com"))
    assert out["risk_level"] == "medium"
    assert "differs from the website" in out["signals"][0]


def test_subdomains_count_as_the_same_organisation():
    assert assess(application(email_domain="mail.savannacapital.co.ke"))["signals"] == []


def test_an_invalid_website():
    out = assess(application(organisation_website="savanna capital"))
    assert any("not a valid web address" in s for s in out["signals"])


def test_two_medium_signals_are_high():
    out = assess(application(email_domain="gmail.com", organisation_website=None))
    assert out["risk_level"] == "high"


# --- Fairness: what is never held against a founder

def test_a_founder_with_gmail_and_a_short_bio_is_low_risk():
    out = assess({"role": "founder", "statement": "Clinic booking app.", "bio": "Nurse, Kisumu.",
                  "organisation_name": None, "organisation_website": None, "email_domain": "gmail.com"})
    assert out == {"risk_level": "low", "signals": []}


def test_a_founder_naming_her_business_with_gmail_is_still_low_risk():
    out = assess({"role": "founder", "statement": "We build a health app.", "bio": None,
                  "organisation_name": "Afya Booking Ltd", "organisation_website": None, "email_domain": "gmail.com"})
    assert out["risk_level"] == "low"


def test_a_founder_with_scam_wording_is_still_flagged():
    out = assess({"role": "founder", "statement": "Send me the processing fee and I will add you as a partner.",
                  "bio": None, "organisation_name": None, "organisation_website": None, "email_domain": "gmail.com"})
    assert out["risk_level"] == "high"


def test_an_expert_with_an_empty_statement_gets_one_weak_signal():
    out = assess({"role": "expert", "statement": None, "bio": None, "organisation_name": None,
                  "organisation_website": None, "email_domain": "gmail.com"})
    assert out == {"risk_level": "low", "signals": ["The statement is too short to check against public information"]}


def test_missing_fields_do_not_crash():
    assert assess({"role": "investor"})["risk_level"] in ("low", "medium", "high")


# --- The endpoint

def test_endpoint_shape(client):
    res = client.post("/vetting/risk-signals", json={"application": application(email_domain="gmail.com")}, headers=KEY)
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"risk_level", "signals"} and body["risk_level"] == "medium"


def test_endpoint_accepts_nulls_from_the_backend(client):
    body = {"application": {"role": "founder", "statement": None, "bio": None, "organisation_name": None,
                            "organisation_website": None, "email_domain": "gmail.com"}}
    assert client.post("/vetting/risk-signals", json=body, headers=KEY).status_code == 200


def test_endpoint_requires_the_key(client):
    assert client.post("/vetting/risk-signals", json={"application": {"role": "founder"}}).status_code == 401
