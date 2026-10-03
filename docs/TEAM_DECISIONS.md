# FounderLink — Team Decisions

**Team:** 4 people — 2 full-stack (frontend, backend) and 2 AI/ML engineers.
**Builds on:** the Kenya edition spec and `docs/KENYA_AMENDMENTS.md`. Where this file conflicts with them, this file wins.

| # | Decision | Short version |
|---|---|---|
| D1 | Participants | Only **founders, investors and experts**. Customers and suppliers are removed. |
| D2 | In-app messaging | All communication happens inside FounderLink: direct chats, circle group chats and deal-room group chats. |
| D3 | Compliance | Compliance becomes a core feature with four parts: business checklist, Ask Compliance, deal compliance and deadlines. |
| D4 | Deals | When people decide to work together, they open a **deal** that tracks every stage from first conversation to closed and beyond. |
| D5 | Ownership | Each of the four team members owns specific folders. |

---

## D1. Participants: founders, investors, experts

**Who is on the platform**

| Role | Who | What they do |
|---|---|---|
| **Founder** | Startup founders and small business owners | Build a profile, get matched, use compliance, join circles, open deals |
| **Investor** | Angels, VC funds, syndicates, programme/grant managers | Publish an investment profile, get matched with founders, join circles, open investment deals |
| **Expert** | Verified mentors, lawyers, accountants | Offer office hours, help with compliance hand-offs, join deals as advisers |

**Removed:** customers and suppliers. "Find customers" and "Find suppliers" are removed from the "What I need" options. Market access stays out of scope for the MVP.

**What changes**

- Investors become **first-class in the MVP** (the original spec left investor profiles for later).
- Investor profile: sectors, stages, ticket size (KSh / USD), counties, instruments (equity, convertible note, loan, grant), and a short investment thesis.
- Investors must be **organisation-verified** before they can message founders first. This is a scam guard: fake investors are common.
- New match type: **Founder ↔ Investor**, using the same explainable scoring (sector, stage, ticket size vs funding need, county).
- Experts are verified against LSK (lawyers) or ICPAK (accountants), or by organisation, before they show as "verified".

**Data:** `users.role` (`founder|investor|expert`), new tables `investor_profiles` and `expert_profiles`.

---

## D2. In-app messaging

All communication between participants happens inside FounderLink, so the full history stays with the circle or deal it belongs to.

**Conversation types**

| Type | Who is in it | Who can see it |
|---|---|---|
| **Direct** | Two people, after both accept the connection | Only those two |
| **Circle** | Every member of a Founder Circle | All circle members |
| **Deal room** | Every party to a deal, plus invited experts | All deal parties |

> Our reading of "seen like a group": circle and deal conversations are shared group chats visible to every member. Direct messages stay private between the two people, because the Data Protection Act and basic safety require it. Change this only as a team decision.

**MVP features**

- Send and receive in real time, with message history
- Unread counts and read markers
- **System messages** in deal rooms, e.g. "Amina moved the deal to *Terms agreed*"
- **Scam guard:** messages that ask for money (M-Pesa numbers, "processing fee", "send money") show a warning to recipients (`ai/moderation/payment_request_detector.py`)
- Report a message; block a user
- New-message notification by push or SMS

**Not in the MVP:** file attachments, voice notes, end-to-end encryption. The privacy notice must say messages are stored on our servers and are not end-to-end encrypted.

**How it works**

- FastAPI WebSocket for live delivery, with messages stored in PostgreSQL. The backend owner decides the folder layout inside `backend/`.
- Every message is checked for membership on the server. Never trust the client to say who can read a conversation.

**Data**

- `conversations` (`id`, `type`: `direct|circle|deal`, `circle_id`, `deal_id`, `created_at`)
- `conversation_members` (`conversation_id`, `user_id`, `joined_at`, `last_read_at`)
- `messages` (`id`, `conversation_id`, `sender_id`, `body`, `kind`: `user|system`, `flagged`, `created_at`)

**API**

```
GET    /conversations
POST   /conversations                    direct chat, only after an accepted connection
GET    /conversations/{id}/messages      ?before=<message_id>  (pagination)
POST   /conversations/{id}/messages
POST   /conversations/{id}/read
POST   /messages/{id}/report
WS     /ws                                authenticated; pushes new messages and events
```

---

## D3. Compliance: a core feature

Compliance has four parts.

### 3.1 Business compliance checklist
Personal checklist chosen by rules from journey type, business status, county, sector, employees and whether personal data is handled. Covers BRS registration, KRA PIN, eTIMS, tax, county permit, employer obligations, ODPC and sector licences (see Kenya amendments §5).
Shows progress as "6 of 9 done". Never a "compliance score" that implies the business is legally compliant.

### 3.2 Ask Compliance (RAG)
Founders ask questions in English or Swahili. Answers come only from stored official sources, with citations and last-verified dates. If the sources don't answer the question, the reply says so and offers a verified expert.
Every question and answer is logged with its citations and user feedback for evaluation.

### 3.3 Deal compliance (new)
When a deal is opened (D4), a checklist appears for that deal type. The Data/Compliance owner must verify every item at the official source before it ships. Candidate items:

| Deal type | Candidate checklist items (verify before use) |
|---|---|
| Co-founder partnership | Founders' / shareholders' agreement; equity split and vesting recorded; company registration with BRS if not yet a company; directors and shareholders updated with BRS; beneficial ownership information filed |
| Investment | Term sheet; investment agreement / shareholders' agreement; share allotment and register updates with BRS; beneficial ownership update; tax and stamp duty questions referred to an accountant; investor's own checks (KYC) |
| Expert engagement | Engagement letter with scope and fees; confidentiality agreement where needed |

Every item says what it is, why it matters, the official source, and **when to get a lawyer or accountant**, with a button to bring a verified expert into the deal room.

> FounderLink records and guides. It does not draft binding legal documents or give legal advice. Facilitating investment offers may bring Capital Markets Authority rules into play, so get legal advice before the platform does more than record relationships.

### 3.4 Deadlines and renewals
A calendar of recurring obligations (e.g. tax filings, permit renewals, annual returns) with reminders by push or SMS. Each deadline links to its source and last-verified date.

### 3.5 Source management (admin)
Admin screen listing every source and item with owner, last-verified and next-review dates. Items past review are flagged and hidden from Ask Compliance answers until re-checked.

**Data**

- `compliance_items`: + `scope` (`business|deal`), `deal_type`
- `compliance_status`: progress per item for a business **or** a deal (`entity_type`, `entity_id`, `item_id`, `status`, `note`, `updated_by`)
- `compliance_deadlines` (`item_id`, `entity_id`, `due_date`, `recurrence`, `reminder_sent_at`)
- `compliance_questions` (`user_id`, `question`, `language`, `answer`, `citations`, `feedback`)

**API**

```
GET    /compliance                       business checklist for the current user
GET    /compliance/{item_id}
PATCH  /compliance/{item_id}/status
POST   /compliance/ask                   RAG question → answer + citations
GET    /compliance/deadlines
GET    /deals/{id}/compliance            deal checklist
PATCH  /deals/{id}/compliance/{item_id}
GET    /admin/compliance/sources         freshness report
```

---

## D4. Deals: what happens after people decide to work together

A **deal** is the record of a working relationship, from the first serious conversation to the result.

**Deal types:** co-founder partnership · investment · expert engagement · joint venture / partnership

**Stages**

```
Exploring → Due diligence → Terms agreed → Documents & compliance → Closed → Active
     \___________________ Paused / Declined (with reason) at any stage ___________________/
```

| Stage | Meaning |
|---|---|
| Exploring | The parties are talking seriously. The deal room opens. |
| Due diligence | They are checking each other: documents, references, traction. |
| Terms agreed | Key terms are recorded, e.g. amount, instrument, equity %, roles. |
| Documents & compliance | Agreements signed and the deal compliance checklist completed. |
| Closed | Every party confirmed the deal is done. |
| Active | After closing: milestones and check-ins at 30, 90 and 180 days. |

**Rules**

- A deal can only be opened between people with an accepted connection, or members of the same circle.
- **Every party must confirm** a stage change to *Terms agreed* or *Closed*. One person cannot mark a deal closed alone.
- Terms are **recorded by the parties** and labelled "self-reported, not a legal document".
- **No money moves through FounderLink.** Investment money goes directly between the parties through their banks.
- MVP stores document **names and status** only (e.g. "Shareholders' agreement — signed 12 Nov"). The parties keep the documents.
- Every change is written to a timeline that every party can see.

**Why this matters for the AI**
Closed deals are the strongest signal of a good match. Each deal links back to the match that started it, so later we can measure which matches lead to real partnerships and train ranking on them (learning-to-rank).

**Deal room screen:** parties and roles · current stage with "propose next stage" · group chat (D2) · deal compliance checklist (D3.3) · recorded terms · timeline · milestones.

**Data**

- `deals` (`id`, `type`, `title`, `stage`, `status`, `source_match_id`, `circle_id`, `terms` JSON, `created_by`, `closed_at`)
- `deal_parties` (`deal_id`, `user_id`, `role`: `founder|investor|expert`, `confirmed_stage`)
- `deal_events` (`deal_id`, `actor_id`, `event`, `from_stage`, `to_stage`, `note`, `created_at`)
- `deal_milestones` (`deal_id`, `title`, `due_date`, `status`)

**API**

```
POST   /deals                             from a connection or circle
GET    /deals
GET    /deals/{id}
POST   /deals/{id}/parties
POST   /deals/{id}/stage                  propose a stage change
POST   /deals/{id}/stage/confirm          another party confirms
PATCH  /deals/{id}/terms
GET    /deals/{id}/timeline
POST   /deals/{id}/milestones
PATCH  /deals/{id}/milestones/{mid}
```

**Scope note:** the original spec said "no complex VC deal room". This stays true. The deal tracker records stages, terms, a checklist and a chat. It does not handle payments, cap tables or legal document generation.

**Demo addition:** after the connection is accepted, the founder and the ML engineer chat in-app, open a *Co-founder partnership* deal, both confirm *Terms agreed*, and the deal checklist shows the founders' agreement and BRS steps, with a button to bring in a verified lawyer.

---

## D5. Who owns what

| Person | Owns | Folders |
|---|---|---|
| Full-stack 1 (frontend) | All screens, navigation, chat UI, deal pipeline UI, English/Swahili text | `frontend/` |
| Full-stack 2 (backend) | API, database, auth, WebSocket messaging, deals, circles, payments sandbox | `backend/`, `docker-compose.yml` |
| AI/ML 1 | Profile extraction, embeddings, founder ↔ founder / investor / expert matching, ranking, explanations, matching evaluation | `ai/extraction`, `ai/embeddings`, `ai/matching`, `ai/ranking`, `ai/explanations`, `ai/evaluation/eval_matching.py`, `data/seed/` |
| AI/ML 2 | Compliance rules engine and RAG, scam/payment-request detection, compliance and opportunity data | `ai/compliance_rag`, `ai/moderation`, `ai/evaluation/eval_compliance_rag.py`, `data/compliance/`, `data/opportunities/` |

Product, design and pitch work is shared. Name one owner for each before the demo.

### Contract between `backend/` and `ai/`
The backend imports the `ai` package and calls these functions. Agree on them before writing code:

```python
# ai/extraction/profile_extractor.py
extract_profile(free_text: str, language: str) -> dict          # structured fields

# ai/matching/pipeline.py
recommend(user_id: str, role_filter: list[str], limit: int = 10) -> list[dict]
# each item: {candidate_id, score, signals: {...}, explanation}

# ai/compliance_rag/rules_engine.py
applicable_items(profile: dict, scope: str = "business", deal_type: str | None = None) -> list[str]

# ai/compliance_rag/answer.py
answer(question: str, language: str, profile: dict) -> dict
# {answer, citations: [{source, url, last_verified}], confident: bool, suggest_expert: bool}

# ai/moderation/payment_request_detector.py
check_message(text: str) -> dict                                 # {flagged: bool, reasons: [...]}
```
