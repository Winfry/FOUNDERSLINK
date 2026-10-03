# FounderLink — Kenya Amendments

**Status:** Proposed changes to the FounderLink Product & Engineering Documentation
**Purpose:** Fix ten gaps that make the current spec generic rather than Kenyan. Each amendment says **where** it goes in the main spec (§ numbers refer to the original document), gives **replacement or additional text** to paste in, and lists the **data/API/scope** changes it implies.

> **History. For what we are building now, read `docs/PRODUCT.md`.** Status of each amendment (4 October): **dropped for now (D11):** 4 (SME journey), 6 (local funding: grants, government funds, SACCOs, AGPO), and group funding in 7. **Changed:** 8 and 9 (verification now happens in levels, D12; identity through a provider, no ID stored). **Still apply:** 1 (M-Pesa, for circle contributions only), 2 (phone first), 3 (Swahili), 5 (Kenyan compliance, for startups), 7 (circles, without group funding), 10 (experts; the business model is a pitch slide).
>
> **Superseded in places by `docs/TEAM_DECISIONS.md`.** In particular: the backend is **Node.js**, so "FastAPI" below refers only to the internal Python AI service (D8); everyone is vetted and approved before joining, which replaces optional verification and the "no national ID" rule in §8–9 (D7); and customers and suppliers are no longer platform participants (D1).

> Regulatory details (tax thresholds, levies, county permit names) change frequently, often with each year's Finance Act. Every factual requirement below must be checked against the official source before it is used in the product or the pitch, and recorded with a "last verified" date.

---

## Summary

| # | Issue | Fix in one line | MVP? |
|---|---|---|---|
| 1 | No M-Pesa | Non-custodial M-Pesa reconciliation + STK Push into the group's *own* Paybill | Must (reconciliation) |
| 2 | Web-first | Mobile-first, lightweight, WhatsApp + SMS channels | Must |
| 3 | English only | English + Swahili UI, multilingual embeddings | Must (UI) / Should (AI) |
| 4 | Startup-only | SME/informal journey as a first-class path | Must |
| 5 | Generic compliance | Kenya-specific checklist, county-aware, dated sources | Must |
| 6 | No local funding | Government funds, AGPO, SACCOs, bank SME products | Must |
| 7 | Chama premise | "Founder Circles" for existing trust groups; no AI-matched money pools | Must |
| 8 | Weak trust/safety | Kenyan registry checks, scam guards, safety controls | Must |
| 9 | Own data protection | Data Protection Act 2019 compliance plan | Must |
| 10 | No supply incentive / business model | Expert incentives + partner-funded model | Pitch + Should |

---

## 1. M-Pesa and the financial layer

**Problem.** Kenyan business money moves through M-Pesa (Till, Paybill, Send Money). Chama contributions are mostly M-Pesa transfers to a treasurer or a group Paybill. A tracker that relies on manual entry loses to WhatsApp + M-Pesa statements.

**Fix.** Make M-Pesa the default payment rail while keeping the non-custodial rule.

- **Reconciliation (MVP):** a group links its own Paybill/Till, or the treasurer uploads an M-Pesa statement. FounderLink matches transactions to members and goals automatically.
- **Contribution prompt (Should-have, sandbox only):** STK Push via Safaricom Daraja *sandbox* that sends money **directly to the group's own Paybill**. FounderLink only records the confirmation and never receives the funds.
- **Banks as pathways, not the centre:** Absa remains a potential partner, presented alongside other banks and SACCOs. The financial section recommends based on the founder's need, not the sponsor.

**Where to add in the spec**

- **§8.2 Critical boundary** — add:
  > FounderLink never receives, holds or forwards money. M-Pesa payments go directly from a member to the group's own Paybill, Till or bank account. FounderLink only reads confirmations or statements to keep records accurate.
- **§8.1 MVP features** — replace "Track contributions" with:
  > Track contributions via M-Pesa statement upload or Paybill confirmation, with manual entry as a fallback. Flag unmatched or missing payments for the treasurer.
- **§10** — rename to **"Financial Ecosystem Layer (M-Pesa, banks, SACCOs)"** and add:
  > M-Pesa is the default rail for Kenyan users. Bank partners such as Absa are offered as pathways where they fit the founder's need (for example, a business account once the business is registered or a chama account for a formal group). Never claim a live integration that is only a sandbox.
- **§16.2 Architecture → Optional** — add "Safaricom Daraja (sandbox)".

**Data / API**

- New table `payment_records` (`chama_id`, `member_id`, `amount`, `currency`, `mpesa_receipt`, `payer_phone_hash`, `source`: `statement|paybill_callback|manual`, `matched_status`, `recorded_at`).
- `POST /chamas/{id}/statements` (upload & parse), `POST /payments/mpesa/callback` (Daraja confirmation), `GET /chamas/{id}/reconciliation`.
- Never store M-Pesa PINs or statement passwords. Delete uploaded statements after parsing.

---

## 2. Mobile-first and low-bandwidth

**Problem.** The target founder uses a mid-range Android phone, pays for data in bundles and lives on WhatsApp. The spec treats mobile as Phase 5 polish.

**Fix.**

- **Platforms:** a mobile app (Android first) **and** a web app. Recommended: one **Expo (React Native)** codebase with Expo Router and NativeWind (Tailwind syntax) that builds Android, iOS and web. Alternative: React + Vite web app plus a separate Expo app sharing an API client package. *Team to confirm.*
- **Lightweight:** target a small first load, lazy-load screens, compress images, cache the last dashboard, matches and checklist for offline viewing.
- **WhatsApp:** share matches and opportunities through `wa.me` links. After both sides accept a connection, offer "Continue on WhatsApp".
- **SMS fallback:** critical notifications (connection accepted, contribution due, deadline in 3 days) by SMS via a Kenyan SMS provider such as Africa's Talking (sandbox for the demo).
- **Later:** USSD for checking chama balances and deadlines on feature phones.

**Where to add in the spec**

- **§16.1 Recommended stack** — replace the Frontend line:
  > Frontend: Expo (React Native) + Expo Router + NativeWind, targeting Android, iOS and web from one codebase. Android is the primary target device.
- **§26 Development Order** — move "Mobile responsiveness" from Phase 5 into **Phase 1 Foundation** as "Mobile-first base layout tested on a low-end Android device".
- **§27 Definition of Done** — add:
  > Works on a low-end Android phone on a slow 3G connection. Key screens show cached content offline.
- **§13 Should-have** — add "WhatsApp share links", "SMS notifications".

**Data / API**

- `users.phone` (verified by OTP), `users.notification_channel` (`push|sms|whatsapp_link|email`).
- `notifications.channel`, `notifications.delivery_status`.

---

## 3. Language: English and Swahili

**Problem.** UI and AI are English-only. Common English sentence-embedding models handle Swahili and Sheng poorly, so a founder who writes in Swahili gets worse matches.

**Fix.**

- **UI:** English and Swahili from day one using an i18n library (e.g. i18next). Language switch in onboarding and settings. All copy goes through translation files, never hard-coded.
- **Embeddings:** use a model trained on Swahili, such as `sentence-transformers/LaBSE` or `intfloat/multilingual-e5-base`. **Test on a small set of Swahili and Sheng founder descriptions before choosing** and record results in `ai/evaluation/`.
- **Sheng/mixed text:** the LLM converts free text into structured fields (sector, needs, skills) before matching, so matching relies on structured data, not raw slang.
- **Compliance answers:** respond in the user's language and keep source citations in the original language.

**Where to add in the spec**

- **§5.1 Onboarding** — add step 0: "Choose language: English / Kiswahili".
- **§6.6 Technical approach** — replace "SentenceTransformers embeddings" with:
  > Multilingual SentenceTransformers embeddings (e.g. LaBSE or multilingual-e5) evaluated on English, Swahili and mixed Sheng founder text.
- **§27 Definition of Done** — add "All user-facing text exists in English and Swahili."

**Data / API**

- `users.preferred_language` (`en|sw`).
- `Accept-Language` header respected by `/compliance` and `/recommendations/explain`.

---

## 4. The SME and informal business journey

**Problem.** Features assume a venture-style tech startup (co-founder, VC, accelerators). Most Kenyan founders run informal businesses or SMEs that need registration, KRA, eTIMS, permits, suppliers, customers and working capital.

**Fix.** Two first-class journeys that share the same platform:

| | Startup journey | SME / informal journey |
|---|---|---|
| Typical needs | Co-founder, developer, mentor, investors | KRA PIN, eTIMS, permit, bookkeeper, suppliers, customers, working capital |
| People matches | Co-founders, mentors, technical talent | Accountants, bookkeepers, business mentors, suppliers, peer business owners |
| Funding | Grants, accelerators, angels | Government funds, SACCO and bank SME loans, AGPO tenders |
| Compliance focus | Incorporation, data protection, sector licence | Business name, KRA PIN, eTIMS, county permit, food/health certificates |

**Where to add in the spec**

- **§4.1 Primary user** — add:
  > The primary user includes informal and small business owners (retail, agribusiness, services, manufacturing) as much as tech startups. Onboarding asks about the business, not "the startup".
- **§5.1 Onboarding step 1** — replace with:
  > Choose what describes you: Idea · Informal business (not yet registered) · Registered small business · Startup · Growing business. This choice sets the journey.
- **§5.1 step 4 "What you need"** — add options: "Register my business", "Get a KRA PIN / eTIMS", "Find customers", "Find suppliers", "Working capital", "Bookkeeping".
- **§14 Demo Journey** — add a **second short demo path**: the Mombasa retail founder registers, sees the eTIMS step, gets matched with a bookkeeper and sees a Women Enterprise Fund or SACCO option.

**Data / API**

- `founder_profiles.journey_type` (`startup|sme`), `founder_profiles.business_status` (`idea|informal|registered_business_name|limited_company`), `founder_profiles.county`.

---

## 5. Kenya-specific Compliance Navigator

**Problem.** "Registration, tax, data protection" is too generic. Requirements differ by business type, county, sector and employees, and they change every year.

**Fix.** A rule-based checklist (which items apply) plus RAG (explaining each item with cited sources).

**Core checklist (verify every item at source before publishing)**

| Area | Item | Institution / source |
|---|---|---|
| Registration | Business name or company registration | Business Registration Service via eCitizen |
| Tax | KRA PIN | Kenya Revenue Authority (iTax) |
| Tax | eTIMS electronic invoicing | KRA |
| Tax | Turnover Tax / income tax / VAT (threshold-based) | KRA |
| County | County business permit (name and fee differ by county) | Relevant county government |
| Employer | PAYE, NSSF, SHIF (Social Health Authority), Affordable Housing Levy | KRA, NSSF, SHA |
| Data | Registration as data controller/processor where required | Office of the Data Protection Commissioner (ODPC) |
| Sector | Sector licences, e.g. KEBS, Pharmacy and Poisons Board, KMPDC, CBK, CMA, CA, NEMA, county food-handler and health certificates | Relevant regulator |
| Opportunity | AGPO certificate (for eligible youth, women and PWD-owned businesses) | National Treasury AGPO portal |

**Rules**

- Items are selected by `journey_type`, `business_status`, `county`, `sector`, `has_employees`, `handles_personal_data`.
- **County-aware:** the MVP covers the demo counties (Nairobi, Mombasa, Kisumu, Machakos) and says clearly that other counties are "not yet covered — check with your county".
- **Freshness:** every item and source shows "Last verified: <date>". Items older than the review date are flagged in the admin tools.
- **Finance Act tracking:** each tax or levy item records the Finance Act year it reflects.

**Where to add in the spec**

- **§7.1** — replace example areas with the table above.
- **§7.3 RAG rules** — add:
  > Each compliance item has a named owner on the team, a `last_verified_at` date and a `next_review_at` date. The UI shows the last-verified date. If a county is not covered, say so rather than generalising from Nairobi.

**Data / API**

- `compliance_items`: add `jurisdiction_level` (`national|county`), `county_code`, `applies_when` (JSON rules), `institution`, `finance_act_year`, `last_verified_at`, `next_review_at`, `owner`.
- `compliance_sources`: add `retrieved_at`, `document_hash` (detect when the source changes).

---

## 6. Local funding and opportunities

**Problem.** The listed sources (VC, angels, corporate venture) are the hardest for an under-networked founder to reach. Kenya's most accessible capital and market-access sources are missing.

**Fix.** Seed and prioritise these categories:

| Category | Examples (verify current status and terms) |
|---|---|
| Government funds | Hustler Fund (Financial Inclusion Fund), Youth Enterprise Development Fund, Women Enterprise Fund, Uwezo Fund, county enterprise funds |
| Government procurement | AGPO: a share of public procurement reserved for youth, women and persons with disabilities |
| Cooperative finance | SACCOs (SASRA-regulated deposit-taking SACCOs) |
| Bank SME products | SME loans, asset finance, chama/group accounts from Kenyan banks |
| Grants & programmes | Foundation grants, accelerators, university and hub programmes, pitch competitions |
| Equity | Angels and VC funds (for startups that fit) |

**Rules**

- Every opportunity shows **type** (grant / loan / equity / tender / programme), **deadline**, **application fee** and **last verified date**.
- **Grants with an application fee are flagged** and are not shown as recommended without admin review (see §8 scam guards).
- **Sensitive eligibility (age, gender, disability):** some programmes (AGPO, Youth and Women funds) depend on these. Collect them **only if the user opts in**, explain why, and use them **only to check opportunity eligibility, never to rank or match people**.

**Where to add in the spec**

- **§9.1 Sources** — add the table above.
- **§6.3 Inputs** — add:
  > Optional, consented eligibility attributes (age band, gender, disability status) are used only to check eligibility for opportunities that require them. They are never used in people matching.
- **§28 Demo Data** — add at least one AGPO, one Women Enterprise Fund or YEDF and one SACCO opportunity, each labelled with its source and verified date.

**Data / API**

- `opportunities`: add `opportunity_type`, `deadline`, `application_fee`, `currency`, `last_verified_at`, `source_url`, `verified_by`.
- `opportunity_eligibility`: add `requires_youth`, `requires_women_owned`, `requires_pwd`, `requires_registration`, `counties`.
- New table `saved_opportunities` (`founder_id`, `opportunity_id`, `saved_at`, `reminder_at`). This also fixes the missing join table for founder ↔ opportunity.

---

## 7. Founder Chama → Founder Circles

**Problem.** Kenyan chamas run on trust that already exists (family, church, workplace, cohort). AI-suggested groups of strangers pooling money invite fraud. Record-keeping tools already exist (e.g. Chamasoft and bank chama products).

**Fix.** Reframe the feature as **Founder Circles**:

- **Money circles are invite-only** among people who already know each other. Members join by invite link or phone number, never through AI suggestion.
- **AI may suggest learning circles only**: peer groups for accountability and advice, with no money.
- **Differentiator vs existing chama apps:** link the circle to founder goals and opportunities.
  - Show **group loans** the circle may qualify for (several government funds lend to registered groups).
  - Show **AGPO tenders** a group could bid for together.
  - Guide the group through **registration** (e.g. as a self-help group) when that unlocks group finance.
- M-Pesa reconciliation from amendment 1 replaces manual entry.

**Where to add in the spec**

- **§8** — rename to **"Founder Circles (Chama)"** and add:
  > FounderLink does not create money groups between strangers. Money circles are invite-only. AI suggestions are limited to non-financial learning circles. The value is linking a circle to its goals, group financing and tenders, not just recording contributions.
- **§6.2 Match types** — change "Founder ↔ Founder community/chama" to "Founder ↔ learning circle (non-financial)".
- **§14 Demo step 16** — replace with:
  > The founder creates a circle with two people she already knows, invites them by WhatsApp link, and sees a group fund the circle could apply for once registered.

**Data / API**

- `chamas`: add `circle_type` (`money|learning`), `registration_status`, `registration_number`.
- `POST /chamas/{id}/invites` returns a share link. Money circles reject members who were not invited.

---

## 8. Trust, verification and safety

**Problem.** Fake investors, "grant processing fee" scams and impersonation are common. The spec's verification is generic, and there are no safety controls for women connecting with strangers.

**Fix.**

**Verification levels using Kenyan sources** (MVP = manual admin check against public registers; automate only where an approved API exists)

| Level | Check |
|---|---|
| Phone verified | OTP to a Kenyan mobile number |
| Business verified | Admin check on BRS business search (eCitizen) |
| Tax verified | Admin check on KRA PIN checker |
| Lawyer verified | Admin check on the Law Society of Kenya advocate search |
| Accountant verified | Admin check on the ICPAK member register |
| Organisation verified | Confirmation from the organisation's official email domain |

Never label anyone "KYC verified" or "ID verified" unless an actual identity check took place.

**Scam guards**

- Platform rule shown on every opportunity and in the pitch: **"Legitimate grants never charge an application or processing fee. FounderLink never asks you to pay to be matched."**
- Messages containing payment requests (M-Pesa numbers, "processing fee", "send money") show a warning banner to the recipient.
- Opportunity providers must be verified before they can post.
- One-tap report with a review queue. Accounts reported several times are paused pending review.

**Safety controls (especially for women founders)**

- Contact details (phone, WhatsApp, email) are hidden until **both** people accept the connection.
- Users choose who can message them: anyone / verified users only / nobody.
- Location is shown at county level only, never a precise location.
- Optional women-only learning circles.
- First-meeting guidance: meet online or in a public place, and tell someone.

**Where to add in the spec**

- **§11** — replace the verification list with the table above and add the scam guards and safety controls.
- **§21 Security & Privacy** — add "Contact details are private until mutual acceptance" and "Payment-request warnings in messages".

**Data / API**

- `verification_records`: add `method` (`otp|brs|kra|lsk|icpak|domain`), `checked_by`, `checked_at`, `evidence_ref`.
- New table `reports` (`reporter_id`, `reported_user_id`, `reason`, `status`).
- `founder_profiles.message_permission` (`anyone|verified|none`).
- `POST /reports`, `POST /users/{id}/block`.

---

## 9. FounderLink's own data protection (Data Protection Act 2019)

**Problem.** A product that teaches compliance must be compliant itself. The spec has generic privacy rules but does not address the Kenya Data Protection Act 2019, ODPC registration or cross-border data transfer (Supabase and LLM APIs are typically hosted outside Kenya).

**Fix.**

- **Registration:** confirm whether FounderLink must register with the ODPC as a data controller/processor before public launch. A hackathon demo with seed data is lower risk, but the production plan must include this.
- **Minimise:** do not collect national ID numbers in the MVP. Do not store verification documents. Admins check public registers and record only the result.
- **Consent:** explicit, granular consent for (a) profile visibility, (b) using data for matching, (c) optional eligibility attributes, (d) SMS/WhatsApp contact. Store each consent with a timestamp.
- **Cross-border transfer:** document where each service stores data. Tell users in the privacy notice. Prefer providers with appropriate safeguards and the closest available region.
- **LLM calls:** send only the structured fields needed, never names, phone numbers or emails.
- **Rights:** users can export and delete their data.
- **Breach plan:** a named owner and a process to notify the ODPC and affected users within the legal deadline (72 hours for the Commissioner, per the Act — confirm at source).
- **Retention:** delete uploaded M-Pesa statements after parsing. Delete inactive demo accounts after the hackathon.

**Where to add in the spec**

- New section **§21.1 Kenya Data Protection Act compliance** with the points above.
- **§33 Checklist** — add "Privacy notice + consent screens", "Data-flow map of all third-party services".

**Data / API**

- New table `consents` (`user_id`, `purpose`, `granted`, `granted_at`, `withdrawn_at`).
- `GET /me/export`, `DELETE /me`.

---

## 10. Supply-side incentives and business model

**Problem.** There's no reason for mentors, lawyers and accountants to join, so the people side of matching stays empty. There's also no business model, which judges will ask about.

**Fix — supply side**

- **Value for experts:** a verified professional profile, qualified client leads (founders who already know what they need), and a public "helped X founders" record.
- **Low commitment:** experts offer a limited number of "office hours" slots per month rather than open-ended mentoring.
- **Paid consultations (later):** lawyers and accountants can offer fixed-price services, such as business registration or eTIMS setup.
- **Seed through organisations:** onboard experts through accelerators, university entrepreneurship centres, professional bodies and hubs as **target** partners. Do not claim any partnership that is not signed.

**Fix — business model** (free for founders)

| Revenue stream | Who pays | Stage |
|---|---|---|
| Qualified referral fees (with founder consent) | Banks, SACCOs, lenders | After launch |
| Programme listing & application management | Accelerators, grant providers, DFIs | After launch |
| Commission on paid expert consultations | Experts / founders | Later |
| Premium tools for growing SMEs | SMEs | Later |

**Never sell personal data.** Referrals happen only when a founder chooses to share their profile with a specific provider.

**Where to add in the spec**

- New section **§12.4 Supply side** with the incentive points.
- New section **§30.1 Business model** with the table.
- **§32 Pitch** — add one line:
  > Free for founders. Paid by the banks, SACCOs and programmes that want qualified, consenting founders.

**Data / API**

- `expert_profiles` (or a role on `founder_profiles`): `office_hours_per_month`, `services`, `rate` (optional).
- `referrals` (`founder_id`, `provider_id`, `consent_id`, `status`).

---

## Consolidated changes to the main spec

### §13 MVP Scope — revised Must-have

- Mobile-first app (Android primary) + web, English & Swahili
- Founder onboarding with **startup and SME journeys**
- Founder profile, What I have / What I need
- AI matching with explainable match cards (multilingual embeddings)
- **Kenya compliance checklist** (national + demo counties, dated sources)
- **Local** funding & opportunity discovery (government funds, AGPO, SACCOs, grants)
- **Founder Circles** with M-Pesa statement reconciliation
- Verification levels using Kenyan registers + scam warnings
- Contact privacy until mutual acceptance
- Consent screens and privacy notice

### §13 Should-have additions

- Daraja sandbox STK Push into the group's own Paybill
- SMS notifications (sandbox), WhatsApp share links
- Saved opportunities with deadline reminders
- Report/block review queue

### §13 Do-NOT-build additions

- Money groups between AI-matched strangers
- Receiving or forwarding any payment
- Storing ID documents, M-Pesa PINs or statement passwords
- USSD (later)

### §16.2 Architecture — revised

```
Expo app (Android / iOS / web)  ·  EN + SW
                |
                v
           FastAPI API
                |
 +--------+----------+-----------+-------------+----------+
 |        |          |           |             |          |
Profiles Matching Compliance Opportunities  Circles   Trust & Safety
 |        |          |           |             |          |
 +--------+----------+-----------+-------------+----------+
                |
           PostgreSQL + pgvector  ·  consents  ·  audit/events
                |
   Multilingual embeddings  ·  LLM (structured fields only, no PII)

Optional / sandbox:
  Safaricom Daraja (M-Pesa)  ·  SMS provider  ·  Bank partner APIs (e.g. Absa)
```

### §17 Database — new or changed tables

| Table | Change |
|---|---|
| `users` | + `phone`, `preferred_language`, `notification_channel` |
| `founder_profiles` | + `journey_type`, `business_status`, `county`, `message_permission` |
| `compliance_items` | + `jurisdiction_level`, `county_code`, `applies_when`, `institution`, `finance_act_year`, `last_verified_at`, `next_review_at`, `owner` |
| `opportunities` | + `opportunity_type`, `deadline`, `application_fee`, `last_verified_at`, `verified_by` |
| `opportunity_eligibility` | + youth / women-owned / PWD / registration / county criteria |
| `chamas` | + `circle_type`, `registration_status`, `registration_number` |
| `verification_records` | + `method`, `checked_by`, `checked_at`, `evidence_ref` |
| **new** `payment_records` | M-Pesa reconciliation records |
| **new** `saved_opportunities` | founder ↔ opportunity |
| **new** `consents` | DPA consent records |
| **new** `reports` | trust & safety |
| **new** `referrals` | consented provider referrals |

### §18 API — new endpoints

```
POST   /chamas/{id}/statements
GET    /chamas/{id}/reconciliation
POST   /chamas/{id}/invites
POST   /payments/mpesa/callback        (sandbox)
POST   /reports
POST   /users/{id}/block
GET    /me/export
DELETE /me
POST   /me/consents
```

### §23 Team — responsibilities added

- **Data/Compliance Lead:** owns Kenya compliance sources and opportunity data, including `last_verified_at` and review dates.
- **Backend Lead:** owns M-Pesa sandbox, SMS sandbox and consent records.
- **UX/Design Lead:** owns Swahili copy, low-bandwidth design and safety UX.
- **Product Lead:** owns the Data Protection Act checklist and business model slide.

### §26 Development Order — revised Phase 1

Repository · environment · database · auth with phone OTP · **mobile-first base layout** · **i18n setup (EN/SW)** · consent screens · seed demo users.

### §28 Demo Data — additions

- At least one AGPO, one Women Enterprise Fund or YEDF and one SACCO opportunity, each with source and verified date.
- One accountant verified via ICPAK check and one lawyer via LSK check (demo profiles, clearly labelled).
- One Swahili founder profile to show multilingual matching.

### §32 Pitch — additions

- "Built for the phone in her hand, in the language she speaks."
- "Works with M-Pesa, the way Kenyan money already moves — without FounderLink ever holding a shilling."
- "Legitimate grants never charge a fee. FounderLink tells founders that up front."
- "Free for founders, paid by the institutions that want to reach them."
