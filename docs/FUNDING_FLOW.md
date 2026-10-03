# FounderLink — Funding Flow Proposal

**Status:** proposal from the backend owner, for the team to confirm.
**Builds on:** `docs/TEAM_DECISIONS.md` and `docs/KENYA_AMENDMENTS.md`. Section 1 lists the points where this file would change them.

We build one flow first: a founder describes her business, and we show which funders fit, which don't and why, and what she must fix before applying. Circles, messaging and deals wait until this works end to end.

---

## 1. Decisions to confirm

| # | Decision | What it changes |
|---|---|---|
| F1 | The backend is **Node**. It owns the database and the API the frontend calls. | Agreed: D8 in `TEAM_DECISIONS.md`. |
| F2 | The AI code is **exposed over HTTP** as an internal service. The backend sends a shared key on every call. | Same as D8 in `TEAM_DECISIONS.md`. |
| F3 | Funders are **records built from published information**, not users. | D1 makes investors first-class users in the MVP. Investor sign-up moves to the roadmap. This removes the cold-start problem. |
| F4 | Onboarding takes a **typed description** tonight. | Deck upload is a nice-to-have. |
| F5 | The AI service **never reads the database**. The backend sends everything it needs in each request. | D8 lets the AI service read profile tables and own vector tables. Under F5 it does neither, so `user_id` in `/recommend` is replaced by the profile and the candidates. |

---

## 2. How the flow works

The AI decides **fit** (sector, stage, amount, mandate). The backend decides **readiness** (which of the funder's requirements the founder has not met). Together they give three groups:

| Group | Meaning |
|---|---|
| **Apply now** | She fits and meets every requirement. |
| **Apply after you fix this** | She fits, but a requirement is missing, e.g. a KRA PIN or business registration. Each gap links to its compliance item and official source. |
| **Not for you** | Wrong business type, amount or county, or she does not meet an eligibility rule. The reason is shown. |

Each funder can also carry **risk factors**, such as an application fee or details that have not been verified. A risk factor is shown on the card and tells the founder what to check. It does not label the funder a scam and does not move it between groups.

Both paths use the same engine. The difference is data and wording, not separate features.

| | Startup path | SME path |
|---|---|---|
| Question | Who should I pitch? | What money can I get, and what is stopping me? |
| Funders | Angels, VC funds, accelerators, grants | Government funds, SACCOs, bank SME loans, grants |
| Wording | Pitch / Pitch after / Don't pitch | Apply now / Apply after / Not for you |

**SME example (illustrative, not real requirements):** a salon owner in Mombasa, trading informally, wants KSh 150,000 for stock. She sees one fund she can apply to today, a bank SME loan she qualifies for once she registers and gets a KRA PIN, and and a venture fund under "not for you". A "grant" that charges an application fee stays in its group with a risk factor on the card.

Compliance stops being a separate product here: a readiness gap is the compliance item standing between the founder and a specific funder.

---

## 3. Onboarding fields

Only what matching and readiness need. The step is called onboarding or founder profile, not KYC: no identity verification happens.

| Field | Path | Notes |
|---|---|---|
| `journey_type` | both | `startup` or `sme` |
| `business_status` | both | `idea`, `informal`, `registered_business_name`, `limited_company` |
| `description` | both | Free text in English, Swahili or Sheng |
| `sector` | both | From a fixed list |
| `county` | both | |
| `funding_amount_kes` | both | |
| `use_of_funds` | both | Short text |
| `stage` | startup | `idea`, `mvp`, `early_revenue`, `growth` |
| `instruments` | startup | Any of `equity`, `convertible_note`, `loan`, `grant` |
| `months_trading` | sme | |
| `monthly_revenue_band` | sme | Bands, not exact figures |
| `has_employees` | sme | |
| `already_have` | both | Tick list of compliance items she has, e.g. registration, KRA PIN, county permit |
| `women_owned`, `youth_owned`, `pwd_owned` | both | Optional and opt-in. Used only to check eligibility, never to rank |

---

## 4. AI endpoints the backend will call

This merges the endpoint list in `TEAM_DECISIONS.md` (D5, D8) with F5. From their version: the endpoint names, `free_text`, the response fields, bands and the API key. From this proposal: the AI service never reads the database, and every funder sent comes back with a verdict.

Rules for both calls:

- The backend sends `X-Internal-Api-Key` on every call (`AI_SERVICE_API_KEY`).
- No names, emails, phone numbers or ID numbers are sent. Emails and phone numbers are removed from free text first. The eligibility flags (`women_owned` and so on) are never sent, so they cannot affect ranking.
- If a call fails, times out after 8 seconds or returns something invalid, the backend answers with its own rule-based stand-in and says so in the response (`engine: "stand_in"`).

### 4.1 Extract a profile from the description

The founder confirms the fields before anything is saved. The backend drops any field it does not know or whose value is not a valid option.

```
POST /extract-profile
{ "free_text": "Nina salon Mombasa, nataka 150k ya stock", "language": "sw" }

→ { "journey_type": "sme", "sector": "retail",
    "county": "Mombasa", "funding_amount_kes": 150000 }
```

### 4.2 Recommend funders

Every candidate sent must come back, including the ones that don't fit. The "not for you" list depends on this, so there is no `limit`.

```
POST /recommend
{ "profile": { ...onboarding fields, no personal data... },
  "candidates": [ { "id": "...", "kind": "...", "mandate_text": "...",
                    "journey_types": [], "sectors": [], "stages": [],
                    "counties": [], "instruments": [],
                    "ticket_min_kes": 0, "ticket_max_kes": 0 } ] }

→ [ { "candidate_id": "...", "score": 0.82, "band": "good",
      "signals": [ { "signal": "sector", "fits": true,
                     "text": "Funds health businesses" } ],
      "explanation": "Funds health businesses at your stage." } ]
```

- `band` is one of `strong`, `good`, `possible`, `not_a_fit`. Founders see the band, never the number: a score from hand-picked weights would claim precision it does not have. `score` is used only to sort.
- `signals` carries one entry per thing checked, so a "not for you" card can say exactly what did not fit.

The backend then adds readiness: for each funder that fits, it compares the funder's requirements with what the founder already has and returns the gaps.

---

## 5. Funder record format

For whoever curates the data. Each record needs the funder fields in 4.2, plus:

- `requirements`: a list of compliance item ids the funder requires
- `eligibility`: any of `women_owned`, `youth_owned`, `pwd_owned`; empty means open to all
- `application_fee_kes` and `deadline`
- `how_to_apply_url`
- `source_url`, `last_verified_at`, `verified_by`

Every requirement must be taken from the funder's own published source. We need about 20 records covering both paths, including one fee-charging "grant" to show the application-fee risk factor.

---

## 6. Open questions

1. **Data:** who curates the funder records and their requirements?

