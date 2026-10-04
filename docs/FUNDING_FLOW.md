# FoundersLink — Funding Flow Proposal

**Status:** proposal from the backend owner, for the team to confirm.

> **Since 4 October:** funding comes from investors only and founders are startups only (`docs/TEAM_DECISIONS.md` D11): the grant, government-fund, bank, SACCO, SME and group-funding parts below are out of scope for now. Verification happens in levels (D12), which changes section 6.3. The current picture is `docs/PRODUCT.md`. Section 4 (the AI contract) and section 7 (build status) are still current.
**Builds on:** `docs/TEAM_DECISIONS.md` and `docs/KENYA_AMENDMENTS.md`. Section 1 lists the points where this file would change them.

We build one flow first: a founder describes her business, and we show which funders fit, which don't and why, and what she must fix before applying. Circles, messaging and deals wait until this works end to end.

---

## 1. Decisions to confirm

| # | Decision | What it changes |
|---|---|---|
| F1 | The backend is **Node**. It owns the database and the API the frontend calls. | Agreed: D8 in `TEAM_DECISIONS.md`. |
| F2 | The AI code is **exposed over HTTP** as an internal service. The backend sends a shared key on every call. | Same as D8 in `TEAM_DECISIONS.md`. |
| F3 | A **funder record** and an **investor user** are two different things, and the platform has both (section 6). | D1 only describes investors as users. Records are added so founders get matches before any investor has joined. |
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
| `has_employees` | both | Required for an SME, optional for a startup. Decides which compliance items apply |
| `handles_personal_data` | both | Optional. Decides whether data protection items apply |
| `already_have` | both | Tick list of compliance items she has, e.g. registration, KRA PIN, county permit. Each tick is saved as a completed item on her compliance checklist |
| `women_owned`, `youth_owned`, `pwd_owned` | both | Optional and opt-in. Used only to check eligibility, never to rank |

---

## 4. AI endpoints the backend will call

> **Note, 4 October:** the contract has grown since this section was written. It now also has `/documents/precheck`, `/deals/due-diligence-pack`, `/vetting/risk-signals`, `/moderation/check-message`, `/compliance/applicable` and `/compliance/answer`. The authoritative request and answer shapes are in `backend/src/ai/client.ts`. The SME example in this document is from before D11, which removed the SME path.

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

### 4.3 Explain a fit (profile page)

Called when a founder opens an investor's profile. The track record is sent without company names.

```
POST /explain-fit
{ "profile": { ...onboarding fields... },
  "candidate": { ...funder fields as in 4.2... },
  "track_record": [ { "sector": "health", "stage": "mvp", "source": "public" } ],
  "language": "en" }

→ { "band": "strong",
    "components": [ { "signal": "sector", "fits": true, "text": "Funds health businesses" } ],
    "reasons": [ "Funds health businesses at your stage." ],
    "track_record_highlights": [ "Has backed 2 health businesses before" ] }
```

### 4.4 Vetting risk signals

Called when someone submits a vetting application. It sorts the admin queue and tells the admin what to look at. It never approves or rejects anyone.

```
POST /vetting/risk-signals
{ "application": { "role": "investor", "statement": "...", "bio": "...",
                   "organisation_name": "...", "organisation_website": "...",
                   "email_domain": "example.com" } }

→ { "risk_level": "low" | "medium" | "high", "signals": [ "..." ] }
```

The AI gets the email domain, not the address, and never the phone number. The one check that needs the database, whether the same phone number is on another account, is done by the backend and added to the signals.

### 4.5 Which compliance items apply

Called when a founder opens her checklist. The backend sends the items with their conditions, and uses only ids it sent: the AI cannot add an item of its own.

```
POST /compliance/applicable
{ "profile": { ...onboarding fields... },
  "scope": "business", "deal_type": null,
  "items": [ { "id": "employer_registrations", "scope": "business", "deal_type": null,
               "applies_when": { "has_employees": true } } ] }

→ { "item_ids": [ "employer_registrations" ] }
```

### 4.6 Ask Compliance

```
POST /compliance/answer
{ "question": "Do I need a county permit?", "language": "en", "profile": { ... } }

→ { "answer": "...",
    "citations": [ { "source": "County government", "url": "https://...", "last_verified": "2026-10-01" } ],
    "confident": true, "suggest_expert": false }
```

The backend treats an answer with no citation as not confident, whatever the service says, and suggests an expert. The stand-in answers only from an item that has an official source and is not overdue for review. Otherwise it says it cannot confirm.

### 4.7 Check a message for a money request

Called for every message before it is delivered. A flag adds a warning for the people receiving it. It never blocks the message.

```
POST /moderation/check-message
{ "text": "Send the processing fee by M-Pesa to [phone removed]" }

→ { "flagged": true, "reasons": [ "Mentions a fee to be paid" ] }
```

Emails and phone numbers are replaced with placeholders before the text is sent, so the AI can still tell a number was given.

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

## 6. Funder records and investor users

### 6.1 The distinction

| | Funder record | Investor user |
|---|---|---|
| What it is | A description of a source of money: a fund, a grant, a loan product, an angel group | A person who has signed up to act for a funder |
| Where it comes from | Curated by us from what the funder publishes, with a source link and a last-verified date | The investor registers and is vetted and approved (D7) |
| Exists on day one | Yes | No. Only after investors join |
| How it is trusted | Checked against the funder's own source | Checked by an admin: identity, organisation, track record |
| What a founder can do | See the fit, the gaps and how to apply. She applies through the funder's own channel | The same, plus connect in the app, message and open a deal |
| Label on the card | "From public information, last verified <date>" | "Maintained by the funder" |

**How they connect.** An approved investor can claim the record for their organisation. From then on they keep its mandate, ticket size and requirements up to date, and founders can reach them in the app. An investor whose organisation has no record yet creates one. Matching always runs on records, so a founder sees one list, whether or not anyone has claimed each record.

Many records will never have a user behind them, and that is fine. A government fund or a bank loan product is unlikely to sign up, but a founder still needs to know whether she qualifies.

### 6.2 Why an investor would sign up

An investor's problem is not finding somewhere to put money. It is the time spent filtering what reaches them. So the offer to investors is about better inbound, not more of it:

- **Fewer pitches outside their mandate.** Founders are told not to pitch funders they don't fit, and why.
- **Founders who arrive ready.** Readiness gaps are closed before the founder reaches them: registered, tax-compliant, documents in place.
- **Reach beyond their own network.** Founders outside Nairobi and outside the usual circles, which matters to funders whose mandate covers particular counties or women-led businesses.
- **Control of their own listing.** A claimed record says what the funder actually wants, in place of our reading of their website.
- **Vetted counterparties.** Founders are checked before joining too (D7), so trust runs both ways.
- **A track record that is verified.** Deals closed on the platform appear on their profile as verified (D6).

These are our assumptions. We have not tested them with investors, and the pitch should say so. The first two only become real once there are enough founders on the platform, which is why records come first and investor users second.

### 6.3 What a member sees before and after approval

D7 says nobody is matched until an admin approves them. We keep that for everything that shows one member to another, and show public information and counts before approval, so a new member sees the value before the wait.

| | Before approval | After approval |
|---|---|---|
| Founder | Her funding matches against records built from public information. For a record an investor maintains: the record, and a count ("2 of your matches have investors on FoundersLink"), not the person. | The investor behind a record, and profile pages. |
| Investor | The number of businesses that match her fund, not who they are. Her own record is hidden from founders. | The matching founders, with name, business details and whether each meets her requirements. Her record appears in founders' matches. |
| Anyone | Cannot open a profile page. Does not appear in anyone's matches. | Can open approved members' profiles. Contact details are never shown. |

---

## 7. Build status against `TEAM_DECISIONS.md`

**Updated:** 3 October, 23:52. What the Node backend does today, decision by decision. "Built" means it runs and has tests.

| Decision | Status | Built | Not built |
|---|---|---|---|
| **D1** Participants | Mostly | Sign-up as founder, investor or expert. Founder onboarding on the startup and SME paths. Investor and expert profiles. An investor describes what she funds as a funder record she maintains, or asks to take over an existing record and gets it on approval (section 6). | Founder ↔ founder and founder ↔ expert matching. `investor_profiles` holds the person and organisation only: the mandate lives on the funder record, so it is not stored twice. |
| **D2** Messaging | Mostly | Direct chats between connected members, one per pair. A group chat per circle for its members. A room per deal for its parties, with system messages such as "Amina moved the deal to Terms agreed". Message history a page at a time, unread counts and read markers. A WebSocket at `/ws` that pushes new messages live. A warning on messages that ask for money, shown to the people receiving them. Report a message, with an admin list of reports. Block a member. Membership is checked on the server on every call. | New-message notification by push or SMS. A privacy notice saying messages are stored on our servers and are not end-to-end encrypted: that text belongs in the frontend. |
| **D3** Compliance | Mostly | A personal checklist chosen by rules from journey type, business status, county, sector, employees and personal data, with progress as "3 of 7 done". Status and notes per item. A message when her county is not covered. Ask Compliance, with every question, answer and feedback logged. Deadlines the founder records herself, with overdue flagged. An admin report on how fresh each item is. A checklist per deal, by deal type, using the candidate items in D3.3. Completing an item closes the matching gap on her funding matches. | Reminders by SMS or push. Deadlines that come from the law: we only store dates the founder enters, because we will not invent them. Real items: all eight are demo data with no official source yet, so Ask Compliance cannot yet give a cited answer. |
| **D4** Deals | Mostly | Connections between approved members: request, accept, decline. A deal opens only between connected members or members of the same circle, with the four deal types and six stages. Stages move one step at a time. Terms agreed and Closed need every party to confirm, and changing the terms withdraws earlier confirmations. Pause, resume and decline with a reason. Recorded terms, locked once agreed. Adding a party such as a lawyer. A timeline of every change. Milestones, with 30, 90 and 180-day check-ins created on closing. | `source_match_id`: matches are not stored, so a deal links to the funder record it grew out of. Closing does not require the checklist to be complete: the deal records, it does not enforce. |
| **D5** AI contract | 7 of 9 endpoints | `/extract-profile`, `/recommend`, `/explain-fit`, `/vetting/risk-signals`, `/compliance/applicable`, `/compliance/answer` and `/moderation/check-message`, with the API key, in the shapes in section 4. A rule-based stand-in answers each one until the AI service is reachable. | `/embeddings/refresh`, which the backend does not need (F5). `GET /health` is not called. |
| **D6** Recommended profiles | Partly | A profile page for founders, investors and experts, open to approved members only. A founder sees her fit with an investor: band, per-signal breakdown and track-record highlights. Investors add portfolio entries and founders add past ventures, each labelled "Public source" or "Self-reported". A portfolio company is named only if it agreed or the deal is public. A closed investment deal becomes a "Verified on FoundersLink" entry on the investor's record, shown only when every party allows it. The profile shows the connection status, for the Connect button. | Activity signals such as "usually replies within 2 days". Save and Not relevant. Verified venture entries for founders. |
| **D7** Vetted network | Mostly | An approval status on every user. An application the person fills in and submits. Risk signals on submission. An admin queue sorted by risk, with approve, reject and needs-more-info, each with a written reason and recorded checks. Suspend and reinstate. An audit log. Evidence uploads (PDF, JPEG, PNG) that only admins can open, reviewed one by one, and deleted 30 days after the decision. The two-admin rule for investors, switched on with `INVESTOR_APPROVALS_REQUIRED=2` (the default is 1, which D7 allows for the demo). Two-step sign-in for admins with an authenticator app. Re-checks: approval lasts a year, and changing the organisation or professional registration puts the member on the admins' re-check list. Reports from three different members suspend the sender until an admin has looked. A guard that blocks unapproved members, read from the database on every request. Admins are created by a script, never by sign-up. | Real identity, OTP and register checks: the identity step is a manual admin review and no ID number or document is stored. Uploaded evidence is not encrypted on disk.  |
| **D8** Node backend | Mostly | Node, TypeScript, Express, Prisma, PostgreSQL. The backend owns the schema and migrations. Shared key on AI calls. The backend keeps working when the AI service is down. | `pgvector` is not enabled. `docker-compose.yml` is still empty. No deployment. |

**From `KENYA_AMENDMENTS.md`**

| Amendment | Status | Built | Not built |
|---|---|---|---|
| **7** Founder Circles | Mostly | Money and learning circles. A money circle can only be joined by a single-use invite from its organiser, and is never suggested to anyone. Learning circles can be found, are suggested by sector and county, and joined without an invite. Organiser, treasurer and member roles. Goals with progress. Meeting minutes and notes. Votes. A group chat. Group funding the circle could apply for, with "register the group" shown as the gap, and the circle's registration status. | Invites by phone number: there is no phone on accounts yet. Women-only learning circles: that needs a field we do not collect. AGPO tenders for groups: there is no tender data. The endpoints are under `/circles`, not `/chamas`. |
| **1** M-Pesa | Partly, and unverified against Safaricom | The treasurer uploads the rows of a statement (as CSV text or JSON). Each payment in is matched to a member by her verified phone number, whole or masked, or else by her full name. Anything that could fit two members, or nobody, is left unmatched for the treasurer to assign or set aside. A receipt is never counted twice, however often a statement is uploaded. A reconciliation shows who has paid, who still owes this period and what is unmatched. A circle can record its own Paybill or Till number, and an endpoint accepts Safaricom's payment confirmation for it. Manual entry remains the fallback. FoundersLink never holds or moves money, never stores the upload, and masks phone numbers in what it keeps about an unmatched payer. | **Nothing here has been run against a real M-Pesa statement or the Daraja sandbox.** The column names and confirmation fields are written from memory of Safaricom's formats. A real statement is a password-protected PDF, which this does not read. The confirmation endpoint is off unless `MPESA_CALLBACK_SECRET` is set, and the Paybill would still have to be registered with Safaricom to send confirmations. STK Push is not built. |
| **9** Data protection | Mostly | Consent recorded purpose by purpose, with when it was given and withdrawn: being visible to other members, sending business details to the AI service, storing eligibility attributes, and being contacted. Each is enforced: without it she is not shown to others, her details stay inside the backend, and eligibility attributes are refused. Withdrawing eligibility consent deletes the attributes. A full export of her own data. Account deletion, confirmed with her password. No ID numbers or documents are stored anywhere. Emails and phone numbers are stripped before anything goes to the AI service. | ODPC registration, a privacy notice, a breach plan and a data-flow map: those are documents, not code. Deletion is immediate and total: shared records she wrote, such as her messages and deal timeline entries, go with her, where a production system would keep them anonymised and give a grace period. |
| **2, 3, 8** Phone, language and safety | Partly | A Kenyan phone number on the account, verified by a six-digit code. Preferred language, used for compliance answers and fit explanations. Each member chooses who may ask to connect: anyone, members with a verified phone, or nobody. Email and phone are shown to a connection only after both accept, and she can keep them private. A WhatsApp link is offered when her number is verified. Reporting a member, counted together with message reports towards suspension. | Email works through Resend: a code to verify the address at sign-up, password reset by code, and the vetting decision. The phone code is not actually texted: no SMS provider is set up, so in development it is returned in the response. The SMS sender is written for Africa's Talking but has only been run against a fake server. The mobile app, Swahili screens and offline use are frontend work. Location is already county-level only. |
| **10** Experts | Partly | A directory of approved experts, filtered by profession, sector and county. Services offered. Office hours: an expert sets how many sessions she takes a month, members ask, she accepts or declines, and accepting connects the two so they can talk. A count of people she has helped, from finished sessions. A "register checked" badge when an admin has recorded a passed professional-register check. Ask Compliance offers experts when its answer is "get an expert". | Paid consultations and rates. Referral records and the partner-funded business model, which is a pitch slide. The expert register check itself is a manual admin step, not a lookup. |
| **2** Notifications | Mostly | A notification is stored and pushed live for: a connection request and its acceptance, a vetting decision, every deal change (to the other parties), and office-hours requests and answers. Unread count, mark one or all as read. Deadline reminders three days ahead, sent once per deadline, checked hourly and runnable by an admin. SMS is attempted only for a member who chose SMS, has a verified number and agreed to be contacted, and each notification records what happened to it. | Actual SMS delivery: no provider is set up, so those notifications are marked `sms_not_configured`. Push notifications to a phone. Notifications for new chat messages, which show as unread counts. WhatsApp share links for matches, which are built in the frontend. |

**Where the build differs from `TEAM_DECISIONS.md` on purpose**

- `/recommend` receives the profile and the candidates, not a `user_id`, and returns every candidate (F5, section 4.2).
- When the AI service is down, the backend answers with its stand-in and labels the answer, where D8 says to show "temporarily unavailable".
- A fee is a risk factor on a funder, not a scam label (section 2).
- Before approval a member sees public information and counts, not nothing (section 6.3).
- What a founder already has is stored once, as completed checklist items. Onboarding ticks and the checklist both write there, and funder readiness reads it.
- `/compliance/applicable` also carries the items, so the AI service needs no copy of them.

**Built but not in `TEAM_DECISIONS.md`**

- Funder records with a loader, ten demo funders and eight demo compliance items, all marked as demo data. The funders are made up. The compliance items are real Kenyan requirements by name, but their rules and wording are placeholders nobody has checked at source.
- Readiness gaps and the three groups: apply now, apply after, not for you.
- Risk factors on funders: application fee, passed deadline, not verified, demo data.
- Funders that fund groups are shown to circles only, not to a founder on her own.

---

## 8. Open questions

1. **Data:** who curates the funder records and their requirements?

