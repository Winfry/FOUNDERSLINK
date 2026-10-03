# FounderLink backend

Node + Express + TypeScript + Prisma, on PostgreSQL. Covers auth, onboarding for founders, investors and experts, the funding flow, compliance, vetting, profile pages, connections, deals, messaging and circles. `docs/FUNDING_FLOW.md` section 7 lists what is and is not built against `docs/TEAM_DECISIONS.md`.

## Run it

```bash
cd backend
npm install
cp ../.env.example .env          # set DATABASE_URL to a Postgres database and JWT_SECRET (16+ characters)
npm run db:migrate               # creates the tables
npm run db:generate              # generates the Prisma client
npm run db:seed                  # loads the demo compliance items and funders from data/
npm run admin:create -- you@example.com "a-password" "Your Name"   # an admin, for the vetting queue
npm run dev                      # http://localhost:8000
npm test                         # API tests, against the same database
```

## Endpoints

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/health` | no | Liveness check |
| GET | `/meta/options` | no | Option lists for the onboarding form (sectors, stages and so on) |
| POST | `/auth/register` | no | `{ email, password, full_name, role? }` → `{ token, user }`. `role` is `founder` (default), `investor` or `expert` |
| POST | `/auth/login` | no | `{ email, password }` → `{ token, user }` |
| GET | `/me` | yes | The signed-in user and her `founder_profile` (null until onboarding) |
| PUT | `/me/profile` | yes | Saves the onboarding answers. Fields are in `docs/FUNDING_FLOW.md` section 3 |
| POST | `/me/profile/extract` | yes | `{ text, language? }` → suggested onboarding fields from a typed description. Saves nothing |
| GET | `/compliance/items` | no | The items for the "what you already have" tick list |
| GET | `/funders` | yes | All funder records |
| GET | `/funding/matches` | yes | The founder's funders in three groups: `apply_now`, `apply_after`, `not_for_you` |

### Investors, experts and profiles

| Method | Path | Who | What it does |
|---|---|---|---|
| PUT | `/me/investor-profile` | investor | The person and her organisation |
| PUT | `/me/funder` | investor | What she funds. Creates or updates the funder record she maintains |
| GET | `/investor/matches` | investor | Founders that fit her record. A count only until she is approved |
| POST | `/me/portfolio` | investor | Adds a past investment. With `source_url` it is a public source, without it self-reported |
| PATCH | `/me/portfolio/:id` | investor | Edits an entry or its visibility |
| PUT | `/me/expert-profile` | expert | Profession, register and bio |
| POST | `/me/ventures` | founder | Adds a previous venture |
| GET | `/profiles/:id` | approved members | A member's profile page, with fit and track record. Never contact details |

### Compliance

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/compliance` | founder | Her checklist: the items that apply to her business, with status and progress |
| GET | `/compliance/:item_id` | founder | One item, with her status, note and due date |
| PATCH | `/compliance/:item_id/status` | founder | `{ status: not_started / in_progress / complete, note? }` |
| PUT | `/compliance/:item_id/deadline` | founder | `{ due_date, recurrence? }`. A date she records herself |
| GET | `/compliance/deadlines` | founder | Her deadlines, soonest first, with `overdue` |
| POST | `/compliance/ask` | any user | `{ question, language? }` → answer with citations, or "cannot confirm" |
| POST | `/compliance/questions/:id/feedback` | the asker | `{ feedback: helpful / not_helpful }` |
| GET | `/admin/compliance/sources` | admin | How fresh each item is, with the ones needing attention first |

An item marked complete counts as something the founder already has, so it closes the matching gap in `/funding/matches`.

### Connections and deals

All of these need an approved account. Inside a deal, the caller must also be one of its parties; to anyone else the deal returns `404`.

| Method | Path | What it does |
|---|---|---|
| POST | `/connections` | `{ user_id, message? }`. Asks another approved member to connect |
| GET | `/connections` | Mine, sent and received |
| PATCH | `/connections/:id` | `{ status: accepted / declined }`. Only the person who was asked |
| POST | `/deals` | `{ type, title, with_user_id }`. Needs an accepted connection |
| GET | `/deals`, `/deals/:id` | My deals; one deal with parties, terms, milestones and any pending move |
| POST | `/deals/:id/parties` | `{ user_id }`. Brings in someone the caller is connected with |
| POST | `/deals/:id/stage` | `{ to_stage, note? }`. Moves one stage forward, or proposes it when every party must agree |
| POST | `/deals/:id/stage/confirm` | Confirms a proposed move |
| POST | `/deals/:id/status` | `{ status: paused / open / declined, reason }` |
| PATCH | `/deals/:id/terms` | `{ amount_kes?, instrument?, equity_percent?, roles?, notes? }`. Locked once terms are agreed |
| GET | `/deals/:id/timeline` | Every change, oldest first, with a ready-made sentence in `text` |
| POST | `/deals/:id/milestones` | `{ title, due_date? }` |
| PATCH | `/deals/:id/milestones/:mid` | `{ title?, due_date?, status? }` |
| GET | `/deals/:id/compliance` | The checklist for this deal type |
| PATCH | `/deals/:id/compliance/:item_id` | `{ status, note? }` |
| PATCH | `/deals/:id/sharing` | `{ share }`. Whether this party lets the closed deal show on track records |

Stages run `exploring` → `due_diligence` → `terms_agreed` → `documents_compliance` → `closed` → `active`. Moving to `terms_agreed` or `closed` needs every party: the first call to `/stage` proposes it, and the deal's `pending.waiting_for` lists who has yet to confirm.

### Messaging

All of these need an approved account, and the caller must be in the conversation; to anyone else it returns `404`.

| Method | Path | What it does |
|---|---|---|
| GET | `/conversations` | Mine, most recent first, each with `unread_count` and `last_message` |
| POST | `/conversations` | `{ user_id }`. Opens the direct chat with a connected member, or returns the existing one |
| GET | `/conversations/:id/messages` | `?before=<message id>&limit=50`. Newest first. `next_before` is the cursor for the older page |
| POST | `/conversations/:id/messages` | `{ body }` |
| POST | `/conversations/:id/read` | Marks everything read |
| POST | `/messages/:id/report` | `{ reason }` |
| PUT, DELETE | `/users/:id/block` | Blocks or unblocks a member for direct messages |
| GET | `/admin/reports` | Admin only. Reported messages |

A deal's room is created with the deal and listed with `type: "deal"`. Deal changes appear in it as messages with `kind: "system"` and no sender.

A message that looks like a request for money has `warning: { text, reasons }` for everyone except its sender. It is still delivered.

**Live delivery.** Open a WebSocket to `/ws` and send `{"type": "auth", "token": "<jwt>"}` as the first message, within 5 seconds. The server answers `{"type": "ready"}` and then pushes `{"type": "message", "message": {...}}` for every new message in the member's conversations. Sending is always done over the REST endpoint; the socket only receives. A bad token closes the socket with code `4401`.

### Circles

All of these need an approved account, and, past joining, membership of the circle; to anyone else a circle returns `404`. Paths are under `/circles` (the older docs say `/chamas`).

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/circles` | any member | `{ name, type: money / learning, ... }`. The creator becomes organiser |
| GET | `/circles` | any member | Mine |
| GET | `/circles/suggested` | any member | Learning circles she could join, with reasons. Never money circles |
| GET | `/circles/:id` | circle member | Members, roles, who has paid this period, goals with progress |
| PATCH | `/circles/:id` | organiser | Name, contribution, registration status and number |
| POST | `/circles/:id/invites` | organiser | Returns `{ token, path, expires_at, single_use }`. Single-use for a money circle |
| GET | `/circles/invites/:token` | any member | What the link is for, before joining |
| POST | `/circles/join` | any member | `{ token }` |
| POST | `/circles/:id/join` | any member | Joins a learning circle that chose to be found |
| PATCH | `/circles/:id/members/:userId` | organiser | `{ role: treasurer / member }` |
| DELETE | `/circles/:id/members/:userId` | organiser, or herself | Removes a member, or leaves |
| POST | `/circles/:id/goals` | organiser | `{ title, target_amount_kes?, target_date? }` |
| PATCH | `/circles/:id/goals/:goalId` | organiser | |
| POST | `/circles/:id/contributions` | organiser or treasurer | `{ member_id, amount_kes, paid_at, goal_id?, mpesa_receipt?, note? }` |
| GET | `/circles/:id/contributions` | circle member | The full history |
| POST, GET | `/circles/:id/notes` | circle member | `{ body, held_at? }`. With `held_at` it is the minutes of a meeting |
| POST, GET | `/circles/:id/decisions` | circle member | `{ question }` |
| POST | `/circles/:id/decisions/:decisionId/vote` | circle member | `{ choice: yes / no / abstain }`. Can be changed while open |
| POST | `/circles/:id/decisions/:decisionId/close` | organiser | |
| GET | `/circles/:id/funding` | circle member | Funders that fund groups, and what the circle still needs for each |

A circle's group chat is in `/conversations` with `type: "circle"`. Members of the same circle can open a deal with each other without a separate connection.

### Vetting

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/vetting/application` | any user | Her application and approval status |
| PATCH | `/vetting/application` | any user | Fills it in. Locked once submitted |
| POST | `/vetting/application/submit` | any user | Submits it and scores it for risk |
| GET | `/admin/vetting/queue` | admin | Waiting applications, riskiest first |
| GET | `/admin/vetting/:id` | admin | One application with the person's profiles |
| POST | `/admin/vetting/:id/decision` | admin | `{ decision: approve / reject / needs_info, reason, checks? }` |
| POST | `/admin/users/:id/suspend` | admin | `{ reason }` |
| POST | `/admin/users/:id/reinstate` | admin | `{ reason }` |
| GET | `/admin/actions` | admin | The audit log |

A request from a member who is not approved gets `403` with code `APPROVAL_REQUIRED` on the endpoints that need approval. What each role sees before and after approval is in `docs/FUNDING_FLOW.md` section 6.3.

Send the token as `Authorization: Bearer <token>`.

Errors always look like `{ "error": { "code", "message" } }`. Validation errors also carry `fields: [{ path, message }]`.

## Funding matches

Each card in `/funding/matches` has:

- `funder`: the record, including `how_to_apply_url`, `source_url` and `last_verified_at`
- `source`: `public_information`, or `maintained_by_funder` when an approved investor keeps the record
- `investor`: the person behind a maintained record, shown to approved founders only. Until then `investor_locked` is true
- `band`: how well the funder fits: `strong`, `good` or `possible`. It is `null` in `not_for_you`
- `explanation`: one or two sentences on why it fits, or why it does not
- `reasons`: the detail behind that, one `{ signal, fits, text }` per signal
- `gaps`: what stands between the founder and this funder. `kind: "requirement"` points at a compliance item; `kind: "unanswered"` points at a profile field she has not filled in
- `risk_factors`: things to check before applying, e.g. an application fee. They never change the group

The response also has `engine`: `ai_service` when the AI service answered, `stand_in` when the backend's own rules did.

## AI service

Set `AI_SERVICE_URL` in `.env` to the AI service's base URL. Set `AI_SERVICE_API_KEY` to the shared key, which is sent as `X-Internal-Api-Key`. The backend calls `/extract-profile`, `/recommend`, `/explain-fit`, `/vetting/risk-signals`, `/compliance/applicable`, `/compliance/answer` and `/moderation/check-message` on it (shapes in `docs/FUNDING_FLOW.md` section 4). If the variable is empty, or a call fails, times out or returns something invalid, the backend falls back to the rule-based stand-in in `src/ai/standin.ts`.

Emails and phone numbers are removed from the description before it is sent, and the eligibility flags are never sent.

## Data

`npm run db:seed` loads `data/demo-compliance-items.json` and `data/demo-funders.json`. Every record in them is made up and marked `is_demo`. To load real, curated files in the same format:

```bash
npm run db:seed -- path/to/items.json path/to/funders.json
```
