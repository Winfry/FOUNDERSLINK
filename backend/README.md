# FounderLink backend

Node + Express + TypeScript + Prisma, on PostgreSQL. Covers auth, onboarding for founders, investors and experts, the funding flow, compliance, vetting, profile pages, connections, deals, messaging, circles, experts and notifications. `docs/FUNDING_FLOW.md` section 7 lists what is and is not built against `docs/TEAM_DECISIONS.md`.

## Run it

```bash
cd backend
npm install
cp ../.env.example .env          # set DATABASE_URL to a Postgres database and JWT_SECRET (16+ characters)
npm run db:migrate               # creates the tables
npm run db:generate              # generates the Prisma client
npm run db:seed                  # loads the demo compliance items and funders from data/
npm run admin:create -- you@example.com "a-password" "Your Name"   # an admin, for the vetting queue
npm run db:demo -- "a-password"  # the people in the demo story (see "Demo accounts" below)
npm run dev                      # http://localhost:8000
npm test                         # API tests, against the same database
```

## API docs

With the server running, Swagger UI is at `http://localhost:8000/docs` and the raw OpenAPI 3.1 document at `/openapi.json`. Neither needs a token. They cover every HTTP endpoint; the WebSocket at `/ws` is described in the document's introduction, since OpenAPI has no way to describe it.

The document is built in `src/docs`, one file under `src/docs/paths` per router. How it is kept in step with the code:

- Request bodies and query strings are generated from the same Zod schemas the routers parse with, so they cannot drift from validation. Rules Zod checks across fields (a `.refine`) do not survive the conversion and are written into the operation's description.
- Responses are not validated anywhere, so their schemas are written by hand in `src/docs/schemas.ts` and the path files. When a service changes what it returns, change them too.
- `test/openapi.test.ts` walks the routes registered on the Express app and fails if a route has no operation, if an operation has no route, or if the documented access (token, approved account) differs from the route's guards. A new route therefore fails `npm test` until it is added to the matching file in `src/docs/paths`.

The tables below are the short version, kept by hand.

## Basics for every call

- **Base URL:** `http://localhost:8000` locally. The frontend reads it from `API_BASE_URL` (see `.env.example`).
- **Auth:** send the token from `/auth/register` or `/auth/login` as `Authorization: Bearer <token>`.
- **Errors** always look like `{ "error": { "code", "message" } }`. Validation errors also carry `fields: [{ path, message }]`. Show `message` to the person: it is written for them.
- **Error codes the screens must handle:**

| Status | Code | Meaning | What the screen does |
|---|---|---|---|
| 401 | | No token, or it expired | Go to login |
| 403 | `APPROVAL_REQUIRED` | She is not approved yet | Show her application status (`GET /vetting/application`) |
| 409 | `PROFILE_REQUIRED` | Onboarding is not finished | Send her to onboarding |
| 409 | `CONSENT_REQUIRED` | She has not agreed to what this needs | Ask for the consent (`POST /me/consents`) |
| 404 | | Not found, or not hers to see | "This is no longer available" |

- **`engine`**: answers that used AI say `ai_service`, or `stand_in` when the backend's own rules answered. Don't show it to members; it is for the team and for demos.
- **`disclaimer`** and **`notice`** fields are written to be shown as they are, under the content they belong to.

## Screens and the endpoints they use

A guide for the web and mobile apps. Each screen uses the real API; no mock data. Full details of every endpoint are in the tables after this section.

> **Agreed by the team (4 October):** the apps show no wallet, balance, deposit, withdrawal or escrow, and no FounderLink bank account or Paybill. FounderLink never holds or moves money. The apps collect no ID number and no ID or passport document: identity is checked by an admin, and the backend stores only the result.

### 1. Sign up, onboarding and approval

| Step | Call |
|---|---|
| Option lists for every form (sectors, stages, counties…) | `GET /meta/options` |
| Create the account, choosing founder, investor or expert | `POST /auth/register` `{ email, password, full_name, role }` |
| Consents, one switch each, nothing ticked by default | `GET /me/consents`, `POST /me/consents` `{ purpose, granted }` |
| Founder: describe the business in her own words, then confirm the suggested fields | `POST /me/profile/extract` `{ text, language }` → `{ fields, unsure, engine }`; then `PUT /me/profile` |
| Investor: the person, then what she funds | `PUT /me/investor-profile`, then `PUT /me/funder` |
| Expert: profession, register, services, office hours | `PUT /me/expert-profile` |
| Phone number, verified by code | `PATCH /me` `{ phone }`, `POST /me/phone/code`, `POST /me/phone/verify` `{ code }` |
| The application for approval | `GET /vetting/application`, `PATCH /vetting/application`, `POST /vetting/application/submit` |
| Where am I? | `GET /me` → `approval_status`: `draft`, `submitted`, `in_review`, `needs_info`, `approved`, `rejected`, `suspended`, `banned` |

The application takes `phone`, `organisation_name`, `organisation_website`, `statement`, `references` and, for an investor taking over an existing funder record, `claims_funder_id`. **There is no ID number or document field.** Show "Your identity is checked by the FounderLink team" in their place.

### 2. Funding matches

| Step | Call |
|---|---|
| Her matches in three groups | `GET /funding/matches` → `apply_now`, `apply_after`, `not_for_you`. Investors and accelerators only (D11), labelled Pitch / Pitch after / Don't pitch |

Each card shows the funder's name, `band` (Strong / Good / Possible; none in "not for you"), `explanation`, and a "Why?" view built from `reasons` (one `{ signal, fits, text }` each, green tick or cross). In "apply after", list `gaps`. A gap with `kind: "requirement"` links to that compliance item (screen 4). Show `risk_factors` as a warning line, e.g. an application fee. Link `funder.how_to_apply_url`, and show "From public information, last checked <`funder.last_verified_at`>" or "Maintained by the funder" from `source`. On the startup path, label the groups Pitch / Pitch after / Don't pitch.

### 3. Profile page and fit

| Step | Call |
|---|---|
| A member's profile | `GET /profiles/:id` |
| Connect | `POST /connections` `{ user_id, message? }`; the button reads `connection.status`: `none`, `pending`, `accepted`, `declined` |

For an investor viewed by a founder, the response has `fit`: `{ band, components, reasons, track_record_highlights }`, in her preferred language.
- `band` and the first line of `reasons` go at the top ("A good fit, with one thing to check.").
- `components` are the fit breakdown: one row per signal with a tick or cross and its `text`.
- The other `reasons` are the "Why it fits", "Check:" and "Add … to your profile" lines.
- `track_record_highlights` sit above `track_record`. Each entry has a `source_label` badge: "Verified on FounderLink", "Public source" or "Self-reported".

`contact` (email, phone, WhatsApp link) is present only once both have accepted the connection. Never show a profile's contact details any other way. A founder's page has `founder` and `track_record` (her past ventures); an expert's has `expert`.

### 4. Compliance

| Step | Call |
|---|---|
| Her checklist | `GET /compliance` → `{ progress: { text: "3 of 7 done" }, county: { covered, message }, items, disclaimer }` |
| One item | `GET /compliance/:item_id`: `why`, `documents_needed`, `when_to_get_help`, `institution`, `source_url`, `last_verified_at`, `status`, `due_date` |
| Mark progress | `PATCH /compliance/:item_id/status` `{ status: not_started / in_progress / complete, note? }` |
| A date she records | `PUT /compliance/:item_id/deadline` `{ due_date, recurrence? }`; list: `GET /compliance/deadlines` (with `overdue`) |
| Ask Compliance | `POST /compliance/ask` `{ question, language? }` → `{ id, answer, citations, confident, suggest_expert, experts, experts_available, disclaimer }` |
| Was it helpful? | `POST /compliance/questions/:id/feedback` `{ feedback: helpful / not_helpful }` |

Show progress as the `progress.text` sentence, never as a score or percentage. If `county.covered` is false, show `county.message`. An item with `is_demo: true` or `needs_review: true` gets a "not yet checked against the official source" label. In Ask Compliance, show every citation as a link with its `last_verified` date. When `suggest_expert` is true, show the `experts` with an "Ask for a session" button (`POST /experts/:id/office-hours`), or "N experts can help once you are approved" from `experts_available`. Always show `disclaimer`.

### 5. Deals

| Step | Call |
|---|---|
| My deals | `GET /deals` |
| Open a deal with a connection or a circle member | `POST /deals` `{ type, title, with_user_id, source_funder_id? }`. `type`: `cofounder_partnership`, `investment`, `expert_engagement`, `joint_venture` |
| The deal room | `GET /deals/:id` → `stage_label`, `next_stage`, `pending.waiting_for`, `terms`, `parties`, `milestones`, `notice` |
| Move it on | `POST /deals/:id/stage` `{ to_stage }`; another party confirms with `POST /deals/:id/stage/confirm` |
| Pause, resume, decline | `POST /deals/:id/status` `{ status, reason }` |
| Terms | `PATCH /deals/:id/terms` `{ amount_kes?, instrument?, equity_percent?, roles?, notes? }` |
| Timeline | `GET /deals/:id/timeline`: each event has a ready sentence in `text` |
| Deal checklist | `GET /deals/:id/compliance`, `PATCH /deals/:id/compliance/:item_id` |
| Milestones | `POST /deals/:id/milestones`, `PATCH /deals/:id/milestones/:mid` |
| Show on track records after closing | `PATCH /deals/:id/sharing` `{ share }` |
| The deal's chat | `GET /conversations` → the one with `type: "deal"` (screen 7) |

Show stages as a stepper: `exploring` → `due_diligence` → `terms_agreed` → `documents_compliance` → `closed` → `active`. When `pending` is set, show "Waiting for <names> to confirm" and a Confirm button for those listed. Label terms "Recorded by the parties, not a legal document", and show the `notice`.

### 6. Circles (replaces the wallet screens)

| Step | Call |
|---|---|
| My circles, and learning circles to join | `GET /circles`, `GET /circles/suggested` |
| A circle | `GET /circles/:id`: members, roles, who has paid this period, goals with progress |
| Contributions recorded from M-Pesa | `POST /circles/:id/contributions` (organiser or treasurer), `GET /circles/:id/contributions` |
| Upload an M-Pesa statement and see who has paid | `POST /circles/:id/statements` `{ csv }`, `GET /circles/:id/reconciliation` |
| The circle's **own** Paybill or Till | `PATCH /circles/:id` `{ paybill_number }` |
| Invite (money circles: single-use link only) | `POST /circles/:id/invites`, `GET /circles/invites/:token`, `POST /circles/join` `{ token }` |
| Goals, notes and minutes, votes | `/circles/:id/goals`, `/circles/:id/notes`, `/circles/:id/decisions` |
| ~~Group funding the circle could apply for~~ | Out of scope for now (`docs/TEAM_DECISIONS.md` D11): don't build a screen |

The finance tab shows **contributions and who still owes**, never a balance. Money goes from members straight to the circle's own Paybill, Till or bank account, and the screen says so: "FounderLink records contributions. It never holds or moves your money."

### 7. Messages and notifications

| Step | Call |
|---|---|
| Conversations (direct, circle, deal) | `GET /conversations`, `POST /conversations` `{ user_id }` |
| Messages | `GET /conversations/:id/messages?before=`, `POST /conversations/:id/messages` `{ body }`, `POST /conversations/:id/read` |
| Live updates | WebSocket `/ws` (see "Live delivery" below) |
| Report or block | `POST /messages/:id/report`, `PUT /users/:id/block` |
| Notifications | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` |

A message with `warning` shows `warning.text` above it in a warning colour. The message itself is still shown.

### 8. Admin dashboard

| Screen | Call |
|---|---|
| Sign in | `POST /auth/login` with an admin account (created with `npm run admin:create`); `GET /me` → `role: "admin"` |
| Applications, riskiest first | `GET /admin/vetting/queue`, `GET /admin/vetting/:id` |
| Decide | `POST /admin/vetting/:id/decision` `{ decision, reason, checks? }` |
| Re-checks | `GET /admin/vetting/rechecks`, `POST /admin/vetting/:id/recheck` |
| Reports | `GET /admin/reports`; `POST /admin/users/:id/suspend`, `/reinstate` |
| Audit log | `GET /admin/actions` |
| Compliance source freshness | `GET /admin/compliance/sources` |

There is no admin withdrawals or transactions screen: no money passes through FounderLink.

## Endpoints

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/health` | no | Liveness check |
| GET | `/meta/options` | no | Option lists for forms (sectors, stages and so on), each also under `labels` as `{ id, label }` pairs |
| POST | `/auth/register` | no | `{ email, password, full_name, role? }` → `{ token, expires_at, user, email_verification }`. `role` is `founder` (default), `investor` or `expert` |
| POST | `/auth/login` | no | `{ email, password }` → `{ token, expires_at, user }`, or `{ two_factor_required, pending_token }` for an admin with two-step sign-in |
| POST | `/auth/email/code` | yes | Sends a new code to her address |
| POST | `/auth/email/verify` | yes | `{ code }`. Sign-up already sent the first code |
| POST | `/auth/password/forgot` | no | `{ email }`. The same answer whether or not the address has an account |
| POST | `/auth/password/reset` | no | `{ email, code, new_password }` |
| GET | `/me` | yes | The signed-in user: `role`, `approval_status`, phone and settings, and her `founder_profile`, `investor_profile`, `expert_profile` or `funder` (null until filled in) |
| PUT | `/me/profile` | yes | Saves the onboarding answers. Fields are in `docs/FUNDING_FLOW.md` section 3 |
| POST | `/me/profile/extract` | founder | `{ text, language? }` → suggested onboarding fields from a typed description. Saves nothing |
| GET | `/compliance/items` | no | The items for the "what you already have" tick list |
| GET | `/funders` | yes | The funder records a founder may see: those built from public information, and those kept by an approved investor. Funders that fund groups are left out |
| GET | `/funding/matches` | founder | The founder's funders in three groups: `apply_now`, `apply_after`, `not_for_you` |

### Consent and her own data

None of these need approval.

| Method | Path | What it does |
|---|---|---|
| GET | `/me/consents` | Every purpose, with whether and when she agreed |
| POST | `/me/consents` | `{ purpose, granted }`. Purposes: `profile_visibility`, `ai_matching`, `eligibility_attributes`, `contact`, `document_processing` |
| GET | `/me/export` | Everything held about her, as a JSON file |
| DELETE | `/me` | `{ password }`. Deletes the account. Refused while she organises a circle with other members or has a deal in progress |

Nothing is agreed by default, so the onboarding screens need to ask. What each consent switches on:

- `profile_visibility`: she appears in other members' matches and her profile page can be opened. Without it both return as if she were not there.
- `ai_matching`: her business details may be sent to the AI service. Without it the backend's own rules answer, and responses say `engine: "stand_in"`.
- `eligibility_attributes`: she may set `women_owned`, `youth_owned` or `pwd_owned`. Without it, sending one returns `409` with code `CONSENT_REQUIRED`. Withdrawing it clears them.
- `contact`: she may be contacted by SMS (notifications and phone codes) and offered as a WhatsApp link to her accepted connections. SMS is only attempted once a provider is set up (see below).
- `document_processing`: documents she uploads for a deal may be read by an AI model outside the AI service. Without it they are checked by a person only.

### Settings and phone number

| Method | Path | What it does |
|---|---|---|
| PATCH | `/me` | Any of `full_name`, `phone`, `preferred_language` (`en` / `sw`), `notification_channel` (`in_app` / `sms`), `message_permission` (`anyone` / `verified` / `none`), `share_contact` |
| POST | `/me/phone/code` | Sends a six-digit code to her phone |
| POST | `/me/phone/verify` | `{ code }` |
| POST | `/reports` | `{ user_id, reason }`. Reports a member. Approved members only |

With no SMS provider set (`SMS_PROVIDER_USERNAME` and `SMS_PROVIDER_API_KEY`), the code cannot be texted. Outside production the response then includes `dev_code` so the flow can still be shown. The sender targets Africa's Talking and has not been run against the real sandbox.

An accepted connection carries `contact: { email, phone, whatsapp_link }` in `GET /connections` and on the profile page, unless that member turned `share_contact` off. The phone appears only if verified.

### Investors, experts and profiles

| Method | Path | Who | What it does |
|---|---|---|---|
| PUT | `/me/investor-profile` | investor | The person and her organisation |
| PUT | `/me/funder` | investor | What she funds. Creates or updates the funder record she maintains |
| GET | `/investor/matches` | investor | `?search=&sector=&stage=&county=&sort=`. Founders that fit her record, each with `match_reasons`. Until she is approved the cards are anonymised: `headline`, sector, stage, county, amount and band, no names |
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
| POST | `/connections` | `{ user_id, message?, pitch?, vision?, offer?, proposed_amount_kes? }`. Asks another approved member to connect |
| GET | `/connections` | Mine, sent and received |
| PATCH | `/connections/:id` | `{ status: accepted / declined, reason? }`. Only the person who was asked |
| DELETE | `/connections/:id` | Withdraws an unanswered request. Only the person who asked |
| POST | `/deals` | `{ type, title, with_user_id, source_funder_id? }`. Needs an accepted connection or a shared circle. `type`: `cofounder_partnership`, `investment`, `expert_engagement`, `joint_venture` |
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
| GET | `/admin/reports` | Admin only. `{ messages, members }`: reported messages and reported members |

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

**M-Pesa.** None of this has been run against a real statement or the Daraja sandbox; see the notes at the top of `src/modules/circles/mpesa.ts`.

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/circles/:id/statements` | organiser or treasurer | `{ csv }` or `{ rows }`. Reads payments in, matches them to members, and returns a summary. The upload is not stored |
| GET | `/circles/:id/reconciliation` | circle member | Who has paid, who still owes this period, and unmatched payments (details for the organiser and treasurer only) |
| PATCH | `/circles/:id/payments/:paymentId` | organiser or treasurer | `{ member_id }` assigns an unmatched payment, `{ ignore: true }` sets it aside |
| POST | `/payments/mpesa/callback/:secret` | Safaricom | The Paybill confirmation. Off unless `MPESA_CALLBACK_SECRET` is set |

A statement needs columns for the receipt number, completion time, details and amount paid in. A row is `{ receipt, completed_at, details, paid_in_kes }`. The circle's own number is set with `paybill_number` in `PATCH /circles/:id`.

A circle's group chat is in `/conversations` with `type: "circle"`. Members of the same circle can open a deal with each other without a separate connection.

### Experts and office hours

All of these need an approved account.

| Method | Path | What it does |
|---|---|---|
| GET | `/experts` | `?profession=&sector=&county=`. Approved experts, those with a free session first |
| POST | `/experts/:id/office-hours` | `{ topic }`. Asks for a session. Refused when she has none left this month |
| GET | `/me/office-hours` | Sessions I asked for, or was asked for |
| PATCH | `/office-hours/:id` | `{ status: accepted / declined / done }`. The expert only |

An expert sets `services` and `office_hours_per_month` in `PUT /me/expert-profile`. Accepting a session creates an accepted connection between the two. `POST /compliance/ask` returns `experts` when `suggest_expert` is true; someone not yet approved gets `experts_available` (a number) and an empty list.

### Notifications

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/notifications` | any user | `?unread=true`. `{ unread_count, notifications }`, newest first |
| POST | `/notifications/:id/read` | its owner | |
| POST | `/notifications/read-all` | any user | |
| POST | `/admin/jobs/deadline-reminders` | admin | Runs the reminder job now. It also runs hourly |

Each notification has `type`, `title`, `body`, a `link` into the app, and `delivery_status`. New ones are also pushed over the WebSocket as `{"type": "notification", "notification": {...}}`.

### Vetting

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/vetting/application` | any user | Her application and approval status |
| PATCH | `/vetting/application` | any user | `{ phone?, organisation_name?, organisation_website?, statement?, references?, claims_funder_id? }`. Locked once submitted. No ID number or ID document is ever taken; business documents are uploaded with the endpoint below |
| POST | `/vetting/application/submit` | any user | Submits it and scores it for risk |
| POST | `/vetting/application/documents` | any user | `multipart/form-data` with `file` and `type`. PDF, JPEG or PNG, up to 5 MB. Before she submits |
| DELETE | `/vetting/application/documents/:id` | its owner | Before she submits |
| GET | `/admin/vetting/documents/:id/file` | admin | Downloads the file |
| PATCH | `/admin/vetting/documents/:id` | admin | `{ status: verified / rejected, reason }` |
| POST | `/admin/jobs/purge-documents` | admin | Deletes files past their 30 days now. It also runs hourly |
| GET | `/admin/vetting/queue` | admin | Waiting applications, riskiest first |
| GET | `/admin/vetting/:id` | admin | One application with the person's profiles |
| POST | `/admin/vetting/:id/decision` | admin | `{ decision: approve / reject / needs_info, reason, checks? }` |
| GET | `/admin/vetting/rechecks` | admin | Approved members due to be looked at again, with why |
| POST | `/admin/vetting/:id/recheck` | admin | `{ outcome: confirm / suspend, reason }` |
| GET | `/admin/vetting/applications` | admin | `?role=&status=&page=`. Every application, decided ones included |
| GET | `/admin/users` | admin | `?role=&status=&search=&page=&page_size=`. Members, a page at a time |
| GET | `/admin/users/:id` | admin | One member: profiles, application, reports against her, and her history |
| GET | `/admin/stats` | admin | The dashboard's numbers, with sign-ups for the last six months |
| GET, POST | `/admin/admins` | admin | Lists admin accounts, or creates one with `{ email, full_name, password }` |
| POST | `/admin/users/:id/suspend` | admin | `{ reason }` |
| POST | `/admin/users/:id/reinstate` | admin | `{ reason }` |
| GET | `/admin/actions` | admin | The audit log |

Set `INVESTOR_APPROVALS_REQUIRED=2` to require two different admins to approve an investor. The first approval then answers `approval_status: "in_review"` with `approvals: { given: 1, needed: 2 }`.

Uploaded files are kept on the server's disk under `UPLOAD_DIR` (default `./uploads`), under a name the backend chooses. They are **not encrypted**, and a real deployment needs proper file storage. Each file is deleted 30 days after the decision on its application; the record of the review stays.

A request from a member who is not approved gets `403` with code `APPROVAL_REQUIRED` on the endpoints that need approval. What each role sees before and after approval is in `docs/FUNDING_FLOW.md` section 6.3.

**Two-step sign-in for admins.** An admin turns it on with `POST /auth/2fa/setup` (returns a secret and an `otpauth://` link for her authenticator app) and `POST /auth/2fa/enable` with `{ code }`. After that, `POST /auth/login` answers `{ two_factor_required, pending_token }`, and `POST /auth/2fa/verify` with `{ pending_token, code }` returns the session. Set `ADMIN_2FA_REQUIRED=true` to make the admin pages refuse any session that was not signed into this way.

**Email** goes through Resend, with `RESEND_API_KEY`. Until a sending domain is verified with Resend, it delivers only to the address that owns the Resend account; other addresses fail. When an email cannot be sent, the response carries `dev_code` outside production, so the flow can still be shown. `EMAIL_FROM` sets the sender.

**Code checks answer the same way everywhere** (email, phone and two-step sign-in): `400 WRONG_CODE`, `400 CODE_EXPIRED`, `429 TOO_MANY_ATTEMPTS`. Password reset is the exception: it answers `400 WRONG_CODE` for everything, so it cannot be used to find out which addresses have accounts.

A request body over 100 kB answers `413 PAYLOAD_TOO_LARGE`. A statement upload may be up to 1 MB.

Send the token as `Authorization: Bearer <token>`.

Errors always look like `{ "error": { "code", "message" } }`. Validation errors also carry `fields: [{ path, message }]`.

## Funding matches

Each card in `/funding/matches` has:

- `funder`: the record, including `how_to_apply_url`, `source_url` and `last_verified_at`
- `anonymised` and `headline`: a record an investor maintains is shown without its name, mandate text or links until the founder is approved. Show `headline` instead. Records from public information are always shown in full
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

### Demo accounts

`npm run db:demo -- <password>` loads the people the demo story in `docs/PRODUCT.md` needs, all with the password you give. Run `npm run db:seed` first. Running it again removes them and starts the story from the beginning, so it is also how to reset after a rehearsal.

| Sign in as | Who | State |
|---|---|---|
| `admin@founderlink.example` | Demo Admin | Admin, for the review queue |
| `grace@founderlink.example` | Grace Otieno, Savanna Angels Network | Approved investor. Maintains the Savanna Angels record. Her track record has two health businesses at MVP, one of them "Verified on FounderLink" |
| `wanjiru@founderlink.example` | Wanjiru Kamau, Daktari Mkononi | Approved founder, the other party to Grace's closed deal |
| `amina@founderlink.example` | Amina Njeri, Afya Booking | Founder in the queue, low risk. Has registered the business, has no KRA PIN |
| `brian@founderlink.example` | Brian Mwangi, Global Capital Partners | Investor in the queue, flagged high risk |

Before Amina is approved, Savanna Angels shows on her matches without its name (it is a member's record). Once approved she sees Savanna Angels under `apply_now`, HealthBridge Accelerator under `apply_after` with the KRA PIN gap, and Rift Growth Fund under `not_for_you`.

The risk levels on the two applications are not written in by hand: both are submitted through the same code as a real applicant.

`npm run db:seed` loads `data/demo-compliance-items.json` and `data/demo-funders.json`. Every record in them is made up and marked `is_demo`. To load real, curated files in the same format:

```bash
npm run db:seed -- path/to/items.json path/to/funders.json
```
