# FoundersLink — What We Are Building

**Updated 4 October, 09:45.**
For what was tested and what is still open, see `docs/FINAL_VERIFICATION.md`.

**Status:** 4 October, after team decisions D1–D13 (`docs/TEAM_DECISIONS.md`).
**This is the one-page truth about the product.** If any other document disagrees with this one about *what* we build, this one wins. For *how* to connect the frontend, read `docs/FRONTEND_INTEGRATION.md`; for one endpoint's details, `backend/README.md`.

---

## 1. In one sentence

**FoundersLink is a vetted network where Kenyan startup founders meet investors and experts, and the AI carries them from the first match to a closed, compliant deal, without FoundersLink ever touching the money.**

## 2. The problem

A founder without connections doesn't know which investors fit her, can't tell a real investor from a scammer, and doesn't know what paperwork a deal needs. An investor wastes time on pitches outside their mandate and has no quick way to check a founder. Experts (lawyers, accountants, mentors) are hard to reach when it matters.

FoundersLink answers three questions:
1. **Who fits me, and why?** Explained matching.
2. **Can I trust them?** Everyone you talk to has been checked; everyone you do a deal with more deeply.
3. **What happens next?** A deal room that goes from first chat to closed, with the compliance checklist and documents in one place.

---

## 3. Who uses it

| Member | Who | What they come for |
|---|---|---|
| **Founder** | A startup founder in Kenya | Find investors who fit, understand why, connect, close a deal, stay compliant |
| **Investor** | An angel, a VC fund, a syndicate, or an accelerator that invests | Founders that fit their mandate, already checked, with readiness visible |
| **Expert** | A verified lawyer, accountant or mentor | Office hours with founders who need them; join deals as an adviser |
| **Admin** | The FoundersLink team | Check members, review documents, handle reports |

> **Note, 4 October:** As of 4 October the app's sign-up offers founders and investors only. The expert journey below is not in the app. This was a build-time cut, not yet recorded as a team decision.

**Not on the platform (for now):** customers and suppliers (D1), small businesses outside the startup path, and grant makers, government funds, banks and SACCOs as funders (D11).

---

## 4. The journey

### Founder
1. **Joins in about two minutes** (level 1): email, password, role, a short profile. She can type her business in her own words, in English, Swahili or Sheng, and the AI fills in the form for her to confirm.
2. **Sees her investor matches straight away**, in three lists: **Pitch**, **Pitch after you fix this**, **Don't pitch**. Each investor has a band (Strong / Good / Possible) and plain reasons. Investors appear anonymised until she is verified.
3. **Works on readiness:** her compliance checklist (KRA PIN, registration…) and Ask Compliance. Fixing a gap moves an investor from "Pitch after" to "Pitch".
4. **Presses Connect** on an investor: if she isn't verified yet, she does **level 2** now (phone code, short statement, an admin approves). Then she sees names, profiles, the fit breakdown and the investor's track record.
5. **Chats** with the investor in the app. A message that asks for money carries a warning.
6. **Opens a deal** when they decide to work together. If an investor sent her a join request with an amount, accepting it connects them and the app offers **"Start an investment deal with these terms?"**, pre-filled; one tap opens the deal (D13). The deal moves through stages: exploring → due diligence → terms agreed → documents and compliance → closed → active.
7. **At due diligence (level 3)** both sides upload documents. The AI pre-checks them and compiles a **due-diligence pack**; an admin confirms.
8. **Terms agreed and closed** need every party to confirm. **The money moves between them through a bank, never through FoundersLink.** The closed deal becomes a verified entry on the investor's track record. Check-ins follow at 30, 90 and 180 days.

### Investor
Joins → describes what they fund (sectors, stages, counties, ticket size, instruments) → sees how many founders match → verifies (level 2, the strictest: organisation and website) → sees matching founders with reasons and readiness → receives and sends connection requests (with a pitch, vision, offer and proposed amount) → chats → deals → due diligence (level 3) → closed deal on their verified track record.

### Expert
Joins → profession, register, services, office hours per month → verifies against LSK or ICPAK (level 2) → appears in the expert directory and in Ask Compliance when an answer says "get an expert" → accepts office-hour sessions → can be added to a deal as an adviser.

---

## 5. What we are building (in scope)

| Feature | What it does | Status |
|---|---|---|
| **Verification in levels** (D7, D12) | Level 1 join; level 2 before contact (admin approves, AI sorts the queue); level 3 at due diligence (documents, identity via a provider) | Levels 1 and 2 work in both apps: sign-up, phone code, statement, and staff approval that reaches the app without a reload. At level 3, documents are uploaded and reviewed by staff. Identity through a provider is not built. The application can still be submitted without the phone being confirmed by code |
| **Investor matches** | Investors that fit a founder, in Pitch / Pitch after / Don't pitch, with bands, reasons, gaps and risk factors | Works in the app: the three lists are right, and investors are anonymised until she is verified. Every match shows as "Good fit"; none shows as "Strong" |
| **Profiles and fit** (D6) | A member's page, with the fit breakdown, reasons, and track record labelled verified / public / self-reported | Partly there. Once approved, a founder sees an investor's fit breakdown and labelled track record. The summary sentence is not shown, an investor has no screen to add or see his own track record, and a founder's page as an investor sees it has no fit band or reasons |
| **Founder ↔ founder and founder ↔ expert matching** | Co-founder and adviser recommendations, explained | **Not built.** Owners: AI/ML 1 and backend |
| **Connections and join requests** | Request (with pitch, vision, offer, amount), accept, decline, withdraw | Works in the app: connect, join request, accept, withdraw and resend. Accepting a join request opens a deal at once, which differs from D13. No screen for a message with a connection request, or a "pending" state on the Connect button |
| **Messaging** (D2) | Direct chats, deal rooms, circle chats; live; money-request warnings; report and block | Works in the app: live chat, the money-request warning, reporting a message to staff, and block. No screen to unblock, no reason when reporting, and no notification for a new message |
| **Deals** (D4) | Stages, confirmations by every party, terms, timeline, milestones, deal checklist | Partly there. Opening a deal, agreeing terms and closing work, with both parties confirming. No screen to change the terms, tick the checklist, pause or decline, add milestones or check-ins, or move to Active. Terms can be agreed before staff have looked at the documents |
| **Due-diligence pack** (D12) | AI document pre-checks and a per-party summary of verified, self-reported and missing items | Uploads and staff review of documents work. Documents read "Uploaded", not "AI pre-checked", and the pack is not shown on the screen. The AI code for both is in the repo and has not yet been run with the backend in the demo |
| **Compliance** (D3) | Startup checklist chosen by rules, progress as "3 of 7 done", deadlines, Ask Compliance with cited answers, freshness report for admins | The checklist works in the app. Ask Compliance answers "No official source for this yet" to every question until the sources are fetched, the index is built and an LLM key is set. No screen for deadlines, the "last verified" date or feedback on an answer |
| **Chamas** (money circles, D13) | Founders come together and pool money into the chama's own account; a forum (chat, notes and minutes, votes); and tracking (contributions per member, goals, who still owes, M-Pesa statement matching). Joined by invite only. Learning circles also exist, for founders who want peers without money | Partly there. The app can start a chama and record a contribution. Invites, settings, goals, notes, votes, the statement and "who still owes" have no screen; the backend has them and its rules passed every check. Group funding is switched off (D11). Investors can also start and join a chama, which differs from D13 |
| **Experts and office hours** | Directory, sessions per month, "helped N founders" | No screen. The backend has it. Since 4 October the app's sign-up offers founders and investors only |
| **Notifications** | In the app and live; SMS once a provider is set up | Work in the app. Nothing is sent for a chama, a suspension, or the other party sharing a document. SMS and email cannot be delivered in the demo |
| **Consents and her own data** | Four consents, export, delete account | Partly there. The app asks a founder three consents and an investor none, and never the documents one. There is a delete-account page, which was not tried for real. No screen to change a consent or export data |
| **Admin dashboard** | Vetting queue sorted by risk, decisions with reasons, document review, re-checks, reports, audit log, statistics, 2FA | Works against the backend: sign-in, the risk-sorted queue, decisions with reasons, deal document review, reports, suspend and reinstate, the audit log. A re-check cannot be decided, deal document decisions are not in the audit log, and two-step sign-in cannot be turned on from the dashboard |
| **English and Swahili, and Sheng in descriptions** | Explanations and compliance answers in her language; Sheng amounts and words understood | Partly there. The Sheng sentence fills only the sector, from the backend's rules; the app does not ask the AI at that point. No language switch is reachable in the app |

## 6. What we are not building (for now)

- **Any money movement in the app:** no wallet, balance, deposit, withdrawal, escrow, or FoundersLink bank account or Paybill (D10).
- **Grants, government funds, bank loans, SACCOs, AGPO tenders** (D11).
- **A separate SME path** (D11).
- **ID collection:** no ID or passport numbers or documents stored, ever. Identity at level 3 comes from a regulated provider as pass or fail (D10, D12).
- **"Funds raised" or "% raised"**, and any **success percentage** for a business (D6, D10).
- File attachments and voice notes in chat; typing indicators.

## 7. The money rule

**FoundersLink records; the bank moves the money.** When a deal closes, the investor pays the founder through a bank (for example Absa, as a partner). In a money circle, members pay into the circle's own Paybill, Till or account, and FoundersLink records the contributions. Any partner-bank integration is shown as a demo until it really exists.

---

## 8. The AI

| AI piece | What it does | Endpoint | Owner | Status |
|---|---|---|---|---|
| Profile extraction | Reads a description in English, Swahili or Sheng and suggests the onboarding fields | `/extract-profile` | AI/ML 1 | Built, and in the build that runs in the demo. The app does not yet ask it during onboarding |
| Investor matching | A band, reasons and a score (for sorting) for every investor sent | `/recommend` | AI/ML 1 | Built, and in the build that runs in the demo |
| Fit explanation | The profile page's fit breakdown and track-record highlights, in English or Swahili | `/explain-fit` | AI/ML 1 | Built, and in the build that runs in the demo |
| Document pre-check | Reads business documents and checks them against the profile | `/documents/precheck` | AI/ML 1 | Code in the repo; not yet run with the backend in the demo. It would fail on a PDF until `pypdf` is installed, and it cannot read photos or scans |
| Due-diligence pack | Summarises each party's verified, self-reported and missing items | `/deals/due-diligence-pack` | AI/ML 1 | Code in the repo; not yet run with the backend in the demo |
| Message scam check | Flags messages that ask for money | `/moderation/check-message` | AI/ML 2 | Code in the repo; not yet run with the backend in the demo |
| Vetting risk signals | Sorts the admin queue and says what to check | `/vetting/risk-signals` | AI/ML 2 | Code in the repo; not yet run with the backend in the demo |
| Compliance rules | Which checklist items apply to a business | `/compliance/applicable` | AI/ML 2 | Code in the repo; not yet run with the backend in the demo |
| Ask Compliance | Answers from official sources only, with citations, or says it can't confirm | `/compliance/answer` | AI/ML 2 | Code in the repo; not yet run with the backend in the demo. Before it can cite, the sources must be fetched, the index built and an LLM key set. Until then every question gets "No official source for this yet" |

**As of 4 October:** the code for all nine endpoints is in `ai/service/routes/`. The AI service that runs in the demo is the older build, with the first three only; for the other six the backend's own rules answer. See `docs/FINAL_VERIFICATION.md` section 6.

**Rules for every AI piece:** it explains itself; it never decides about a person (an admin does); it never claims a document is genuine; it never predicts success; it answers within 8 seconds; and when it is down, the backend's own rules answer and say so (`engine: "stand_in"`).

---

## 9. The shared language

**Backend, frontend, AI, docs and the pitch use these words and nothing else.** The screen may translate a term (for example into Swahili), but the code and the API always use the API name.

| Say | Means | API name and values | Never say |
|---|---|---|---|
| **Member** | Anyone signed up | `user` | Customer, client |
| **Founder** | A startup founder | `role: "founder"`, `journey_type: "startup"` | SME, business owner (as a type) |
| **Investor** | A person who invests or acts for an investing organisation | `role: "investor"` | Funder (for the person), lender |
| **Expert** | A verified lawyer, accountant or mentor | `role: "expert"`, `profession` | Consultant |
| **Admin** | The FoundersLink team | `role: "admin"` | Super admin, reviewer |
| **Investor record** | What an investor funds: sectors, stages, counties, ticket, instruments | `funder` (`kind`: `angel`, `vc`, `accelerator`) | Grant, loan product |
| **Investor matches** | The founder's investors in three lists | `GET /funding/matches` → `apply_now`, `apply_after`, `not_for_you`; on screen **Pitch / Pitch after / Don't pitch** | Funding opportunities, grants |
| **Band** | How well someone fits | `band`: `strong`, `good`, `possible`, `not_a_fit` | Score, %, match percentage |
| **Reasons** | Why it fits or doesn't, one line per check | `reasons` / `components`: `{ signal, fits, text }` | |
| **Gap** | What stands between her and an investor | `gaps` (`kind`: `requirement`, `unanswered`) | Missing documents |
| **Risk factor** | Something to check before going ahead, e.g. a fee | `risk_factors` | Scam label |
| **Level 1 / 2 / 3** | Joined / Verified member / Deal-ready | `approval_status` (level 2 = `approved`); level 3 on the deal | KYC, onboarding (for verification) |
| **Verification** | The level 2 check by an admin | `/vetting/application`, `approval_status`: `draft`, `submitted`, `in_review`, `needs_info`, `approved`, `rejected`, `suspended`, `banned` | Application before an account, reference number, User ID |
| **Connection** | Two members linked after one asks and the other accepts | `connection`, `status`: `pending`, `accepted`, `declined` | Follow, friend |
| **Join request** | An investor's connection request to a founder, with a pitch and an offer. Accepting it creates a connection, then the app offers a pre-filled deal (D13) | `POST /connections` with `pitch`, `vision`, `offer`, `proposed_amount_kes` | Application |
| **Conversation** | A chat | `conversation`, `type`: `direct`, `circle`, `deal` | Group chat (as a type) |
| **Deal** | A working relationship from first serious talk to the result | `deal`, `type`: `cofounder_partnership`, `investment`, `expert_engagement`, `joint_venture` | Group, project, investment (as the container) |
| **Stage** | Where a deal is | `stage`: `exploring`, `due_diligence`, `terms_agreed`, `documents_compliance`, `closed`, `active` | Status |
| **Terms** | What the parties recorded, not a legal document | `terms`: `amount_kes`, `instrument`, `equity_percent`, `roles`, `notes` | Contract |
| **Due-diligence pack** | The AI-compiled summary at level 3 | `/deals/due-diligence-pack` | Report |
| **Chama** (on screen) / **circle** (in code) | Founders who pool money into their own account, talk, and track contributions (D13). A learning circle is the same without money | `circle`, `type`: `money` (a chama), `learning`; roles `organiser`, `treasurer`, `member` | Wallet, project group, investor group |
| **Contribution** | A payment a member made into the circle's own account, recorded | `contribution` / `payment_record` | Deposit, transaction, balance |
| **Compliance item** | One requirement, e.g. KRA PIN | `compliance item`, `status`: `not_started`, `in_progress`, `complete` | Document, KYC |
| **Ask Compliance** | The chatbot for compliance questions | `POST /compliance/ask` | Legal advice |
| **Track record** | Past investments or ventures, labelled by source | `track_record`, `source`: `platform_deal`, `public`, `self_reported` | Portfolio score |
| **Consent** | A member's yes or no to one use of her data | `consent`, `purpose`: `profile_visibility`, `ai_matching`, `eligibility_attributes`, `contact` (+ `document_processing`, D12) | Terms and conditions |
| **AI pre-checked** | The AI read and checked a document; a person has not confirmed it yet | `precheck` | AI-verified |

**Money words never used anywhere:** wallet, balance, deposit, withdrawal, release, escrow, funds raised, % raised.

---

## 10. How it is built, and who owns what

```
Mobile app (founders, investors, experts) ─┐
Admin dashboard (the FoundersLink team) ────┼── REST + WebSocket ──► Node.js backend ──► PostgreSQL
                                           │                         │  internal HTTP + key
                                           │                         ▼
                                           │                   Python AI service
```

| Person | Owns | Folders |
|---|---|---|
| Frontend | Mobile app and admin dashboard | `mobile/`, `admin/`, `shared/` |
| Backend | API, database, auth, verification, messaging, deals, circles, compliance, notifications | `backend/` |
| AI/ML 1 (team lead) | AI service, extraction, Sheng, matching, fit explanations, document pre-checks, due-diligence pack | `ai/service`, `ai/extraction`, `ai/matching`, `ai/ranking`, `ai/explanations`, `ai/embeddings`, `ai/documents` |
| AI/ML 2 | Ask Compliance, compliance rules, message scam check, vetting risk signals, compliance data | `ai/compliance_rag`, `ai/moderation`, `ai/vetting`, `data/compliance` |

---

## 11. The demo story

**Both apps are shown (D13):** the mobile app carries the journey, and the admin dashboard appears once, in step 4, for vetting. A recorded backup of the whole demo is made the night before.

1. **Amina**, a health-tech founder in Nairobi, joins in two minutes and types: *"Tunatengeneza app ya kubook clinic visits, tunahitaji milioni moja."* The form fills itself in.
2. She sees her **investor matches**: Savanna Angels under "Pitch" (Strong fit, with reasons), another under "Pitch after you fix this" (a missing KRA PIN), a VC under "Don't pitch" (their minimum is KSh 10M).
3. She opens Savanna's profile: fit breakdown, and a track record showing *"Has backed 2 health businesses at the MVP stage (1 verified on FoundersLink)"*.
4. She presses **Connect** and is asked to **verify**. In the admin dashboard, her application is approved, while a fake investor next to it, flagged high-risk by the AI, is rejected with a reason.
5. They chat. A message from someone else saying *"tuma processing fee"* carries a warning.
6. They open a **deal**, reach due diligence, upload documents, and see the **AI pre-checks** and the **due-diligence pack**.
7. Both confirm terms; the deal closes. *"The money moves through the bank; FoundersLink records the deal."* The deal appears as **Verified on FoundersLink** on the investor's track record.
8. *(If time allows)* Amina's **chama**: three founders pooling money into their own Paybill. An uploaded M-Pesa statement shows who has paid and who still owes, and they vote on how to use the pool, without FoundersLink ever holding a shilling.

## 12. What we say, and what we never claim

**Say:** "Everyone you talk to has been checked." "The AI explains every match." "We measured our matching: X of the top 10 were right." "FoundersLink never touches the money."

**Never claim:** "100% scam-free", "AI-verified documents", legal advice, a success percentage, a live bank, M-Pesa or identity integration that is only a demo, or an accuracy figure we didn't measure.

---

## 13. Where to look

| Question | Document |
|---|---|
| What are we building? | **This page** |
| Why did we decide it? | `docs/TEAM_DECISIONS.md` (D1–D13) |
| How does the frontend call the backend, method by method? | `docs/FRONTEND_INTEGRATION.md` |
| What does one endpoint take and return? | `backend/README.md` |
| What exactly does the AI service take and return? | `docs/FUNDING_FLOW.md` section 4, and `ai/README.md` |
| What was tested, and what is still open? | `docs/FINAL_VERIFICATION.md` |
| How does the presenter run the demo? | `docs/DEMO_SCRIPT.md` |
