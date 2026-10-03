# FounderLink — Team Decisions

**Team:** 4 people — 2 full-stack (frontend, backend) and 2 AI/ML engineers.
**Stack:** frontend (owner's choice) · **backend: Node.js** · AI service: Python (FastAPI) · database: PostgreSQL + pgvector.
**Builds on:** the Kenya edition spec and `docs/KENYA_AMENDMENTS.md`. Where this file conflicts with them, this file wins.

| # | Decision | Short version |
|---|---|---|
| D1 | Participants | Only **founders, investors and experts**. Customers and suppliers are removed. |
| D2 | In-app messaging | All communication happens inside FounderLink: direct chats, circle group chats and deal-room group chats. |
| D3 | Compliance | Compliance becomes a core feature with five parts: business checklist, Ask Compliance, deal compliance, deadlines and source management. |
| D4 | Deals | When people decide to work together, they open a **deal** that tracks every stage from first conversation to closed and beyond. |
| D5 | Ownership | Each of the four team members owns specific folders. |
| D6 | Recommended profiles | Opening a recommended founder or investor shows key details, an explained fit prediction and their track record (previous investments or ventures), each labelled by source. |
| **D7** | **Vetted network** | **Everyone is checked and approved by FounderLink before they can use the network.** No approval, no matching, no messaging. |
| **D8** | **Backend is Node.js** | **The backend is Node.js, not FastAPI.** The AI stays in Python as a separate internal AI service that the backend calls over HTTP. |
| D9 | How we stand out | The six things that make FounderLink different, and how to show them in the demo. |

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
- **Every** founder, investor and expert must be checked and approved before they can use the network (see D7). Investors get the strictest checks because fake investors are the most common scam.
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

- Node.js real-time layer (e.g. Socket.IO or `ws`) for live delivery, with messages stored in PostgreSQL. The backend owner decides the library and the folder layout inside `backend/`.
- Every message is sent to the AI service (`POST /moderation/check-message`) before delivery so scam warnings can be attached.
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

Compliance has five parts.

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
| Full-stack 2 (backend) | **Node.js** API, database, auth, real-time messaging, deals, circles, vetting workflow and admin review queue, payments sandbox | `backend/`, `docker-compose.yml` |
| AI/ML 1 | Profile extraction, embeddings, founder ↔ founder / investor / expert matching, ranking, explanations, matching evaluation, **the AI service** (`ai/service/`) | `ai/service`, `ai/extraction`, `ai/embeddings`, `ai/matching`, `ai/ranking`, `ai/explanations`, `ai/evaluation/eval_matching.py`, `data/seed/` |
| AI/ML 2 | Compliance rules engine and RAG, scam/payment-request detection, **vetting risk signals**, compliance and opportunity data | `ai/compliance_rag`, `ai/moderation`, `ai/vetting`, `ai/evaluation/eval_compliance_rag.py`, `data/compliance/`, `data/opportunities/` |

Product, design and pitch work is shared. Name one owner for each before the demo.

### Contract between `backend/` and `ai/`
The backend is **Node.js** (see D8), so it cannot import Python code. The AI runs as a separate internal **Python AI service** (`ai/service/`), and the backend calls it over HTTP. Agree on these endpoints before writing code. All requests and responses are JSON.

```
POST /extract-profile          {free_text, language}
                               → {sector, stage, skills, needs, ...}

POST /recommend                {user_id, role_filter: [...], limit}
                               → [{candidate_id, score, band, signals: {...}, explanation}]

POST /explain-fit              {viewer_id, candidate_id, language}            (D6)
                               → {band, components: {...}, reasons: [...], track_record_highlights: [...]}

POST /compliance/applicable    {profile, scope: "business"|"deal", deal_type}
                               → {item_ids: [...]}

POST /compliance/answer        {question, language, profile}
                               → {answer, citations: [{source, url, last_verified}], confident, suggest_expert}

POST /moderation/check-message {text}
                               → {flagged, reasons: [...]}

POST /vetting/risk-signals     {application_id}                               (D7)
                               → {risk_level: "low"|"medium"|"high", signals: [...]}

POST /embeddings/refresh       {user_id}                                      (D8)
                               → {status: "ok"}

GET  /health                   → {status: "ok"}
```

Inside `ai/`, each endpoint calls the matching Python module (e.g. `/recommend` → `ai/matching/pipeline.py`).

---

## D6. Recommended profiles: key details, fit prediction and track record

When the AI recommends a founder or an investor and the user opens the profile, they see:

1. **Who they are:** name, role, county, verification badges.
2. **Why you're seeing this:** a fit band (*Strong / Good / Possible*) and plain-language reasons in the user's language.
3. **Fit breakdown:** one bar per signal (sector, stage, ticket size or skills, location, availability, trust), each with a short label such as "covers your need".
4. **Key details:**
   - Investor: focus sectors, stages, ticket size range, instruments, counties, thesis.
   - Founder: business, sector, stage, traction, skills, what they need.
5. **Track record:** previous investments (investor) or previous ventures (founder), each labelled by source.
6. **Activity signals:** e.g. "Usually replies within 2 days", based on in-app messaging.
7. **Actions:** Connect · Save · Not relevant (feeds recommendation feedback).

### Track record sources

| Label | Source | Trust |
|---|---|---|
| **Verified on FounderLink** | A deal that reached *Closed* in the deal tracker, confirmed by both parties (D4) | Strongest |
| **Public source** | Press release or the fund's own website, with a link | Medium |
| **Self-reported** | Entered by the user | Shown as unconfirmed |

**Privacy rules**
- Investors choose what is visible. Amounts are shown as ranges (e.g. "KSh 500K–2M") or hidden by default.
- A portfolio company is named only if it consented or the deal is already public.
- When a deal reaches *Closed*, the backend creates a verified track-record entry for each investor (and venture entry for founders) automatically, visible only if all parties allow it.

### What the "prediction" is, and isn't

| Prediction | Available | How |
|---|---|---|
| **Fit**: how well this person matches your needs | Now | Weighted score + embeddings, shown as a band with per-component reasons |
| **Response likelihood**: "usually replies within N days" | Now (simple rule) | Reply rate and median reply time from messaging |
| **Deal likelihood**: chance a connection becomes a closed deal | Later, after a few hundred deal outcomes | Learning-to-rank / classifier trained on matches that became closed deals |

**Rules**
- Show bands, not false precision. No "87.3% match" from a hand-tuned formula.
- Never predict that a startup will succeed or that an investment will return money. It is misleading, and can count as investment advice regulated by the Capital Markets Authority.
- A proven track record ranks higher than a stated interest: an investor who has funded health-tech at pre-seed outranks one who only lists health-tech as a focus.

### Measuring accuracy (for the demo)
Hand-label which seed profiles should match each other, then report measured results such as **precision@10** ("8 of the top 10 recommendations matched our labels"). Keep the labelled set and script in `ai/evaluation/`.

### Data
- `investor_portfolio` (`investor_id`, `company_name`, `sector`, `stage`, `year`, `instrument`, `amount_range`, `source`: `platform_deal|public|self_reported`, `source_url`, `deal_id`, `visibility`, `company_consented`)
- `founder_ventures` (`founder_id`, `venture_name`, `sector`, `role`, `years`, `outcome`, `source`, `source_url`, `visibility`)

### API
```
GET    /profiles/{id}?match_id=...       profile + fit breakdown + track record + activity signals
POST   /me/portfolio                      investor adds a self-reported investment
PATCH  /me/portfolio/{entry_id}           edit or change visibility
POST   /me/ventures                       founder adds a previous venture
```

### Ownership
- **AI/ML 1:** `explain_fit`, track-record features in ranking, precision@10 evaluation.
- **Full-stack 2:** portfolio and venture tables, auto-entry on closed deals, profile endpoint.
- **Full-stack 1:** profile screen with fit breakdown and source labels.
- **AI/ML 2:** demo track-record data in `data/seed/` with sources, clearly labelled as demo.

---

## D7. Vetted network: everyone is checked and approved

**Rule:** nobody uses the network until a FounderLink admin has checked and approved them. Founders, investors and experts all go through it. Until approved, a person can only complete their application and see its status. They do not appear in matching, cannot message anyone, and cannot join circles or deals.

> Be precise in the pitch: say **"every member is checked by a person before they join"**, not "100% scam-free". No process can guarantee that, and a judge will push on it. Vetting at the door plus monitoring afterwards is what keeps scammers out.

### Application lifecycle

```
Draft → Submitted → In review → Approved
                       ├──→ Needs more info → Submitted
                       └──→ Rejected (with reason)
Approved → Suspended (after reports or a failed re-check) → Reinstated | Banned
```

### What each role must pass

| Check | Founder | Investor | Expert |
|---|---|---|---|
| Phone OTP (Kenyan number) and email | ✓ | ✓ | ✓ |
| Identity check (ID or passport) | ✓ | ✓ | ✓ |
| Business check on BRS (if registered) | ✓ | — | — |
| Organisation check (official domain, registration, website) | — | ✓ | if employed by a firm |
| Track-record evidence (public deals, or two references) | — | ✓ | — |
| Licence check where they claim one (e.g. CMA register for fund managers) | — | ✓ | — |
| Professional register (LSK for lawyers, ICPAK for accountants) | — | — | ✓ |
| Optional reference (hub, university, accelerator) | ✓ | — | ✓ |

**Identity checks:** in production, use a regulated identity-verification provider (e.g. Smile ID, which operates in Kenya) that returns a pass/fail result. **For the hackathon, the identity step is a labelled demo**: an admin reviews a sample submission by hand. Never claim live KYC unless a real provider integration is running.

### Who decides
- Platform admins (`users.role = admin`) make every decision, with a written reason.
- Investors need **two admins** to approve in production (four-eyes rule). One admin is enough for the demo.
- Every admin action goes into an audit log.

### Where the AI helps (AI/ML 2)
The AI **ranks the review queue and explains why**. It never approves or rejects anyone.

`POST /vetting/risk-signals` returns a risk level and plain-language signals, such as:
- the same phone, email or ID already used on another account
- a disposable email address
- the name on the ID doesn't match the business or professional register
- profile text similar to known scam scripts (e.g. "processing fee", guaranteed returns)
- investor claims that don't match public information

### After approval
- **Reports:** several reports from different approved users pause the account automatically until an admin reviews it.
- **Re-checks:** when key details change (new organisation, new professional status) and once a year.
- **Messages:** the payment-request detector (D2) keeps running on every message.

### Privacy (supersedes Kenya amendments §9 "no national ID numbers")
- The identity provider processes ID documents. **FounderLink stores only the result, the provider's reference and the date**, never the ID image or full ID number.
- Documents uploaded for manual review are encrypted, visible only to admins, and deleted within 30 days of the decision.
- A Data Protection Impact Assessment is needed before launch, because identity data is involved.
- The application screen explains in plain language what is checked and why.

### Data
- `users.approval_status` (`draft|submitted|in_review|needs_info|approved|rejected|suspended|banned`)
- `vetting_applications` (`id`, `user_id`, `role`, `status`, `risk_level`, `submitted_at`, `decided_at`, `decided_by`, `decision_reason`)
- `vetting_checks` (`application_id`, `check_type`, `result`, `method`: `otp|provider|brs|lsk|icpak|cma|domain|reference|manual`, `provider_ref`, `checked_by`, `checked_at`)
- `admin_actions` (`admin_id`, `action`, `target_user_id`, `reason`, `created_at`)

### API (Node.js backend)
```
GET    /vetting/application               my application and status
PATCH  /vetting/application               fill in details
POST   /vetting/application/submit
GET    /admin/vetting/queue               sorted by AI risk level, then oldest first
GET    /admin/vetting/{id}
POST   /admin/vetting/{id}/decision       {decision: approve|reject|needs_info, reason}
POST   /admin/users/{id}/suspend
POST   /admin/users/{id}/reinstate
```

**Enforcement:** one backend middleware blocks every matching, messaging, circle, deal and profile endpoint unless `approval_status = approved`. Matching only ever returns approved candidates.

### Demo moment
Open the admin queue. One applicant is flagged **high risk** (disposable email, "processing fee" in the bio, investor claims with no public trace) and gets rejected with a reason. A real applicant is approved and appears in matching straight away.

---

## D8. Backend is Node.js

**The backend is Node.js.** Every earlier mention of a "FastAPI backend" in the spec and the Kenya amendments now means the Node.js backend. FastAPI is used **only** inside the internal AI service.

### Architecture

```
Frontend (web / mobile)
        │  REST + WebSocket
        ▼
Node.js backend  ── auth, users, vetting, messaging, deals, circles,
        │            compliance status, opportunities, payments sandbox
        │  internal HTTP + API key
        ▼
Python AI service (ai/service, FastAPI) ── matching, explanations,
        │            compliance rules + RAG, moderation, vetting risk signals
        ▼
PostgreSQL + pgvector
```

### Rules
- **Backend:** Node.js. TypeScript recommended. Framework (Express, NestJS, Fastify) and ORM (Prisma, Drizzle, TypeORM) are the backend owner's choice.
- **Real-time:** Socket.IO or `ws` in the Node.js backend.
- **AI service is internal only.** It is never exposed to the internet or called by the frontend. The backend sends an `X-Internal-Api-Key` header on every call.
- **Timeouts and fallbacks:** if the AI service is slow or down, the backend still works. Recommendations show "temporarily unavailable", and messages are delivered without the scam check but marked for later review.
- **Database ownership:** the backend owns the schema and migrations for all tables and must enable the `pgvector` extension. The AI service reads profile tables **read-only** and owns two vector tables: `profile_embeddings` and `compliance_chunks`. If the ORM doesn't handle vector columns well (e.g. Prisma), that's fine: only the AI service queries them.
- **Keeping embeddings fresh:** when a profile changes, the backend calls `POST /embeddings/refresh {user_id}` on the AI service.

### Local setup (docker-compose services)
`frontend` · `backend` (Node.js) · `ai-service` (Python) · `db` (PostgreSQL + pgvector)

### Environment
`AI_SERVICE_URL`, `AI_SERVICE_API_KEY` (see `.env.example`).

---

## D9. How we stand out

Most teams will show an AI that recommends people. These six things make FounderLink different. Each one should be visible in the demo.

| # | Differentiator | Why others don't have it | Show it in the demo |
|---|---|---|---|
| 1 | **A vetted network.** Every member is checked by a person before joining (D7). | LinkedIn, WhatsApp groups and directories let anyone in, so fake investors and grant scams thrive. | The admin queue rejecting a flagged fake investor. |
| 2 | **From match to done deal in one place.** Match → chat → deal → compliance checklist → closed (D2–D4). | Networking apps stop at "connect". Chama apps only keep records. Nobody follows the relationship through to the paperwork. | One founder going from recommendation to a confirmed co-founder deal with its checklist. |
| 3 | **AI you can check.** Every recommendation explains itself, and accuracy is measured (precision@10), not claimed (D6). | Most "AI matching" is a black-box score. | Fit breakdown on a profile, then one slide with the measured precision@10. |
| 4 | **Track records you can trust.** Each past investment says whether it's verified on FounderLink, public, or self-reported (D6). | Profiles elsewhere are self-declared. | An investor profile showing all three labels. |
| 5 | **The network gets smarter with every deal.** Closed deals become verified track records and training data for the matcher. | Without deal outcomes, others can't learn which matches work. This advantage grows over time. | A deal reaching *Closed* and instantly appearing as a verified investment on the investor's profile. |
| 6 | **Built for Kenya.** M-Pesa, Swahili, county-aware compliance, AGPO and government funds, SMEs as well as startups. | Global platforms assume Silicon Valley founders. | A Swahili profile getting good matches, and a county-specific checklist. |

### The one line
> "FounderLink is a vetted network where every member is checked before joining, and the AI doesn't just connect founders with investors, it carries them all the way to a closed, compliant deal."

### What not to claim
- "100% scam-free" (say "every member is checked before joining")
- An accuracy figure you didn't measure
- A live bank, M-Pesa or identity integration that is only a sandbox or demo
