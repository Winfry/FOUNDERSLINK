# FounderLink — Connecting the Frontend to the Backend

**For:** the frontend owner (mobile and admin apps).
**From:** the backend owner.
**Status:** 4 October. Both apps run on mock data today. This page lists what to change in the frontend so they can run on the real backend, service by service.

The backend's endpoints are listed in `backend/README.md`. What is built and not built is in `docs/FUNDING_FLOW.md` section 7.

In the tables below:

- **Ready** means the backend has it today.
- **Coming** means the backend owner is adding it. Build against the shape shown and it will work when it lands.
- **Blocked** means a team decision is needed first (section 9).

---

## 0. First: two source folders are missing from the repo

The root `.gitignore` is a Python template and ignores every folder named `lib/`. So `admin/src/lib/` and `mobile/src/lib/` were never pushed, and neither app runs from a fresh clone: `@/lib/utils`, `@/lib/auth/config`, `lib/application-store` and `lib/validation` are all missing.

To fix it:

```bash
git add -f admin/src/lib mobile/src/lib
git commit -m "fix: add the lib folders the gitignore left out"
git push
```

Changing `lib/` to `/lib/` in the root `.gitignore` stops it happening again.

---

## 1. How to call the backend

| | |
|---|---|
| Base URL | `http://localhost:8000` locally. Put it in one config value |
| Auth | `Authorization: Bearer <token>` on every call except sign-up, login and `/meta/options` |
| Token | One token, valid 7 days. There is no refresh token: drop `refreshToken` and `refreshSession`, and send the user to login on a `401` |
| Field names | The backend uses `snake_case` (`full_name`, `funding_amount_kes`). Map to your `camelCase` types inside the service layer, so screens do not change |
| Errors | Always `{ "error": { "code", "message" } }`. Validation errors add `fields: [{ path, message }]`, which maps onto form fields |
| Live updates | WebSocket at `/ws`. Send `{"type":"auth","token":"..."}` first. It pushes `{"type":"message",...}` and `{"type":"notification",...}` |

Error codes worth handling by name:

| Code | Status | Show |
|---|---|---|
| `APPROVAL_REQUIRED` | 403 | "Available once your account is approved", with a link to her application status |
| `CONSENT_REQUIRED` | 409 | The consent screen |
| `PROFILE_REQUIRED` | 409 | Send her to onboarding |
| `VALIDATION_ERROR` | 400 | Mark the fields in `fields` |

`mobile/src/services/index.ts` already assigns a mock to each service. Write an HTTP version of each beside the mock and switch the assignment. Sections 3 and 8 map every method.

---

## 2. The sign-up flow changes: account first

**Today in the app:** apply with no account → admin approves → email with a User ID and temporary password → set a new password at first login.

**Change to:** sign up with a password → onboarding → submit for vetting → wait. While she waits she can already use everything that involves only herself or public information.

Why: the team wants a new member to see value before the wait, and the backend cannot issue credentials by email.

| Screen today | Change |
|---|---|
| `/founder-application`, `/investor-application` | Become three steps: **sign up** (name, email, password, role), **onboarding** (profile), **vetting application** (phone, statement, organisation, documents) |
| Login with "email or User ID" | Email only. Remove User IDs (`FL-FND-...`, `FL-INV-...`) |
| "Set new password" on first login, `mustChangePassword` | Remove. She chose her password at sign-up |
| Email code at sign-up | Keep. **Coming** in the backend |
| Forgot password with a code | Keep. **Coming** in the backend |
| "Check status" with email and reference number | Replace with a status screen for the signed-in user: `GET /vetting/application` |
| *(new)* Consent screen in onboarding | Add. See 2.2 |
| *(new)* "Waiting for approval" home | Add. See 2.1 |

### 2.1 What she can use before approval

| Can use | Cannot use until approved |
|---|---|
| Onboarding and her profile | Other members' profiles |
| Funding matches against public funder records | Seeing who the investor behind a record is (she sees a count) |
| Compliance checklist, deadlines, Ask Compliance | Connections and join requests |
| Notifications, settings, consents, data export | Chat, groups, deals, the expert directory |
| Her application status | |

Any call she is not yet allowed to make returns `403` with code `APPROVAL_REQUIRED`.

`approval_status` on the user is one of `draft`, `submitted`, `in_review`, `needs_info`, `approved`, `rejected`, `suspended`. It replaces `InvestorApplicationStatus`:

| Your status | Backend `approval_status` |
|---|---|
| *(not applied yet)* | `draft` |
| `pending` | `submitted` or `in_review` |
| `more_info_requested` | `needs_info` (she can edit and submit again) |
| `approved` | `approved` |
| `rejected` | `rejected` |

### 2.2 The consent screen

Nothing is agreed by default. Until she agrees, a founder is invisible to investors and is matched by the backend's rules instead of the AI. Ask during onboarding, each as its own switch:

| `purpose` | Ask her | What it switches on |
|---|---|---|
| `profile_visibility` | "Let approved investors and members see my profile" | She appears in matches and her profile can be opened |
| `ai_matching` | "Use my business details for AI matching" | Her details may be sent to the AI service |
| `eligibility_attributes` | "Record if my business is women-, youth- or PWD-owned, to check which funds I qualify for" | She may set those three fields |
| `contact` | "Contact me by SMS or WhatsApp" | SMS notifications |

`GET /me/consents` lists them. `POST /me/consents` with `{ purpose, granted }` sets one.

---

## 3. Mobile services, method by method

### AuthService

| Method | Backend | Status |
|---|---|---|
| `login({ identifier, password })` | `POST /auth/login` with `{ email, password }` → `{ token, user }` | Ready |
| `signupFounder(input)` | `POST /auth/register` with `{ email, password, full_name, role }`. `role` is `founder`, `investor` or `expert`. Phone is set afterwards with `PATCH /me` | Ready |
| `verifyEmailOtp(email, otp)` | `POST /auth/email/verify` with `{ code }` | Coming |
| `requestPasswordReset`, `verifyResetOtp`, `resetPassword` | `POST /auth/password/forgot`, then `POST /auth/password/reset` with `{ email, code, new_password }` | Coming |
| `setNewPassword` | Remove | |
| `refreshSession` | Remove | |
| `logout()` | No call. Delete the stored token | |

`SessionUser` maps from `GET /me`: `id`, `role`, `email`, `full_name` → `fullName`, `phone`, `approval_status`. Drop `userId` and `mustChangePassword`. `founderOnboardingComplete` is `founder_profile !== null`.

### FounderService

| Method | Backend | Status |
|---|---|---|
| `getProfile()` | `GET /me` → `founder_profile` | Ready |
| `saveOnboardingStep(step, data)` | `PUT /me/profile` once, at the end, with the whole profile. Keep the steps in the app's own store until then | Ready |
| `getDocuments()` | `GET /vetting/application` → `documents` | Coming |
| `getDashboard()` | Compose from `GET /me`, `GET /funding/matches`, `GET /compliance` and `GET /connections` | Ready |
| `getInvestorRequests()` | `GET /connections`, the ones with `direction: "received"` and `status: "pending"` | Ready (pitch fields coming) |
| `respondToInvestorRequest(id, approve, reason)` | `PATCH /connections/:id` with `{ status: "accepted" | "declined" }` | Ready (decline reason coming) |

Founder profile fields:

| Your field | Backend field | Note |
|---|---|---|
| `businessName` | `business_name` | |
| `sectorId` | `sector` | Use the backend's values, section 5 |
| `stage` | `stage` | Same four values. Startup path only |
| `county` | `county` | The county name |
| `description` | `description` | |
| `fundingTargetKes` | `funding_amount_kes` | |
| `yearStarted`, `website`, `socialLinks` | `year_started`, `website`, `social_links` | Coming |
| `profileCompleteness` | `profile_completeness` | Coming |
| `fundsRaisedKes` | *(none)* | Blocked: depends on how money is recorded, section 9 |
| `onboardingStep`, `onboardingComplete` | *(none)* | Keep in the app |

**Add to onboarding, because matching needs them:**

| Field | Values |
|---|---|
| `journey_type` | `startup` or `sme`. Asked first; it decides the rest |
| `business_status` | `idea`, `informal`, `registered_business_name`, `limited_company` |
| `instruments` (startup) | Any of `equity`, `convertible_note`, `loan`, `grant` |
| `months_trading`, `monthly_revenue_band` (SME) | A number; one of the `revenue_bands` in `/meta/options` |
| `has_employees`, `handles_personal_data` | Yes or no. They decide which compliance items apply |
| `already_have` | Tick list from `GET /compliance/items` |
| `women_owned`, `youth_owned`, `pwd_owned` | Optional. Needs the `eligibility_attributes` consent |

The founder can also type a description and have the form filled in: `POST /me/profile/extract` with `{ text, language }` returns suggested fields for her to confirm.

### InvestorService

| Method | Backend | Status |
|---|---|---|
| `getProfile()` | `GET /me` → `investor_profile` and `funder` | Ready |
| `saveMatchingQuestionnaire(data)` | Two calls: `PUT /me/investor-profile` (organisation, job title, bio) and `PUT /me/funder` (what she funds) | Ready |
| `discover(params)` | `GET /investor/matches`. Before approval it returns a count only: show "N businesses match your fund" | Ready (search, filters and sort coming) |
| `getFounderPublicProfile(id)` | `GET /profiles/:id` | Ready |
| `submitJoinRequest(founderId, payload)` | `POST /connections` with `{ user_id, message }` | Ready (pitch, vision, offer and amount as separate fields coming) |
| `getJoinRequests()` | `GET /connections`, the ones with `direction: "sent"` | Ready |
| `withdrawJoinRequest(id)` | `DELETE /connections/:id` | Coming |

Investor profile fields. Her mandate lives on a funder record she maintains:

| Your field | Backend |
|---|---|
| `bio` | `investor_profile.bio` |
| `ticketMinKes`, `ticketMaxKes` | `funder.ticket_min_kes`, `funder.ticket_max_kes` |
| `preferredSectors`, `preferredStages`, `preferredCounties` | `funder.sectors`, `funder.stages`, `funder.counties`. Empty means "any" |
| `projectTypes` | No equivalent. `funder.instruments` and `funder.journey_types` are the closest |

`PUT /me/funder` also needs `name`, `kind` (one of `funder_kinds`), `mandate_text`, `journey_types` and `instruments`.

Discover card fields:

| Your field | Backend |
|---|---|
| `id` | `user_id` |
| `businessName`, `sector`, `stage`, `county` | `business_name`, `sector`, `stage`, `county` |
| `fundingAskKes` | `funding_amount_kes` |
| `matchReasons` | `signals` today (`[{ signal, fits }]`). Sentences are coming |
| `verifiedDocumentsBadge` | Use `ready`: she already meets everything this funder requires |
| `percentRaised` | Blocked, section 9 |

Show `band` (`strong`, `good`, `possible`) as the match strength. Never show a percentage.

`RequestStatus` maps to the connection `status`: `pending`, `accepted` (your `approved`), `declined`. `withdrawn` is coming.

### InvestorApplicationService and the founder application

Both become the vetting application of the signed-in user:

| Method | Backend | Status |
|---|---|---|
| `saveDraft(step, data)` | `PATCH /vetting/application` with any of `phone`, `organisation_name`, `organisation_website`, `statement`, `references` | Ready |
| `submit(data)` | `POST /vetting/application/submit` | Ready |
| `checkStatus(email, ref)` | `GET /vetting/application` → `approval_status` and `application.decision_reason` | Ready |
| Document upload | `POST /vetting/application/documents` | Coming |

There is no reference number. Do not collect an ID number: the backend stores none.

### ChatService

A conversation is a direct chat, a deal room or a circle chat. Use its `id` where you use `groupId`.

| Method | Backend | Status |
|---|---|---|
| `connect()`, `onMessage(cb)` | The WebSocket in section 1 | Ready |
| `getMessages(id, cursor)` | `GET /conversations/:id/messages?before=<cursor>`. The next cursor is `next_before` | Ready |
| `sendMessage(id, payload)` | `POST /conversations/:id/messages` with `{ body }` | Ready |
| `markRead(id, messageIds)` | `POST /conversations/:id/read`. It marks the whole conversation | Ready |
| `onTyping`, `setTyping` | Remove, or ask for it | Not built |

Three things to show in the chat:

- A message with `kind: "system"` has no sender. Show it centred, e.g. "Grace moved the deal to Due diligence".
- A message with a `warning` asks for money. Show the `warning.text` banner above it.
- A report button: `POST /messages/:id/report` with `{ reason }`.

### NotificationService

| Method | Backend | Status |
|---|---|---|
| `list()` | `GET /notifications` → `{ unread_count, notifications }` | Ready |
| `markRead(id)` | `POST /notifications/:id/read` | Ready |
| `markAllRead()` | `POST /notifications/read-all` | Ready |

Each has `title`, `body` and a `link` to open.

### ReferenceDataService

`GET /meta/options` returns every list: `sectors`, `stages`, `counties`, `instruments`, `revenue_bands`, `business_statuses`, `funder_kinds`, `signup_roles`, `consent_purposes`. Values only today. Labels are coming as `{ id, label }`.

### GroupService

**Blocked.** See section 9. Please do not build further on deposits and withdrawals until the team has decided.

---

## 4. The money screens need new wording now

Every team doc says FounderLink never receives, holds or forwards money. The current screens say the opposite. Whatever the team decides in section 9, these can change today:

| Screen | Today | Change to |
|---|---|---|
| Group finance | "FounderLink Escrow — Maziwa Fresh Co." | An account in the partner bank's name, with a label: "Demo. No live bank connection" |
| Group finance | "Group balance" | "Recorded contributions" |
| Deposit | "Confirm deposit" | "Record a payment I made" |
| Deposit | "You will receive M-Pesa / bank instructions" | Show the account to pay into. The app does not take the payment |
| Withdrawal | "Request withdrawal" | "Request a release", with the note that the bank pays out, not the app |

---

## 5. Use the backend's values

Matching compares exact values, so the app has to send these, not its own labels. Read them from `GET /meta/options`.

| List | Values |
|---|---|
| Sectors | `health`, `agri`, `fintech`, `climate`, `retail`, `education`, `logistics`, `other` |
| Stages | `idea`, `mvp`, `early_revenue`, `growth` |
| Counties | The 47 county names, e.g. `Nairobi`, `Mombasa` |
| Roles | `founder`, `investor`, `expert`. Your `UserRole` has no `expert` yet |

---

## 6. Screens the app does not have yet

The backend has these and the app has no screen for them. In order of importance for the demo:

| # | Screen | Backend | Why it matters |
|---|---|---|---|
| 1 | **Funding matches**: three lists, "Apply now", "Apply after you fix this", "Not for you" | `GET /funding/matches` | This is the pitch. Each card has a `band`, an `explanation`, `gaps` and `risk_factors` |
| 2 | **Compliance checklist** with status per item | `GET /compliance`, `PATCH /compliance/:item_id/status` | Completing an item closes the matching gap in screen 1 |
| 3 | **Ask Compliance** | `POST /compliance/ask` | Shows cited answers, or "cannot confirm" with experts to go to |
| 4 | **Consent** and **waiting for approval** | Section 2 | Required by the new flow |
| 5 | **SME onboarding path** | Section 3 | Half the target users |
| 6 | **Experts and office hours** | `GET /experts`, `POST /experts/:id/office-hours` | And the `expert` role |
| 7 | **Deals**: stages, terms, checklist, timeline | `GET /deals/:id` and the rest | Follows a match to a closed deal |
| 8 | **Settings**: phone verification, language, who can connect, export and delete my data | `PATCH /me`, `/me/phone/*`, `/me/export`, `DELETE /me` | |

For screen 1, show the label on every funder that has `is_demo: true` or a `risk_factors` entry. Never call a funder a scam: an application fee is shown as a risk factor with its text.

---

## 7. Language

`PATCH /me` with `{ preferred_language: "sw" }` stores her choice. Compliance answers and fit explanations then come back in that language when the AI service supports it. Screen text in Swahili is the app's own.

---

## 8. Admin dashboard, page by page

| Page | Backend | Status |
|---|---|---|
| Login | `POST /auth/login` with an admin account | Ready |
| Verify 2FA | `POST /auth/2fa/verify` with the code from an authenticator app | Coming |
| Founder and investor applications (list) | `GET /admin/vetting/queue`: waiting applications, riskiest first | Ready (decided applications coming) |
| Application detail | `GET /admin/vetting/:id` | Ready |
| Approve, reject | `POST /admin/vetting/:id/decision` with `{ decision, reason, checks }` | Ready |
| Document status | Per-document verified or rejected | Coming |
| Founders, investors (lists and detail) | `GET /admin/users?role=` | Coming |
| Update a member's status | `POST /admin/users/:id/suspend` and `/reinstate`, each with `{ reason }` | Ready |
| Audit log | `GET /admin/actions` | Ready |
| Reports | `GET /admin/reports` → `{ messages, members }` | Ready |
| Admin users | List and create | Coming |
| Dashboard numbers and charts | `GET /admin/stats` | Coming |
| Groups, withdrawals, transactions | | Blocked, section 9 |

Changes to the application pages:

- **A written reason is required for every decision**, approval included. The backend refuses a decision without one.
- **Add a third action, "Needs more info"** (`decision: "needs_info"`). The applicant can then edit and submit again.
- **Show the risk level and signals** on the list and detail: `risk_level` (`low`, `medium`, `high`) and `risk_signals`. They are there to guide the admin, and the admin still decides.
- **Record the checks made** with the decision: `checks: [{ check_type, result, method }]`, e.g. identity, passed, manual.
- **An investor may need two admins.** The first approval then returns `approval_status: "in_review"` with `approvals: { given: 1, needed: 2 }`. Show "waiting for a second admin".
- **Re-checks:** `GET /admin/vetting/rechecks` lists approved members due to be looked at again.

Two pages the backend has and the dashboard does not: the compliance freshness report (`GET /admin/compliance/sources`) and the re-check list.

---

## 9. Decisions the team still has to make

These block the group, deposit and withdrawal work on both sides.

1. **What a group is.** In the app a group is one founder plus the investors she approved. The backend has two things: a **circle** (peers saving together, with contributions, votes and a chat) and a **deal** (a founder and one or more investors, with stages, terms and a room). Which one do the group screens sit on?
2. **How "the bank holds the money" works.** Who records a payment, who approves a release, and what the admin's withdrawals page does. The backend will build nothing for deposits or withdrawals until this is written down.
3. **What accepting a join request creates:** a connection only, or a deal as well.
4. **Which app is shown in the demo:** mobile, admin or both.
