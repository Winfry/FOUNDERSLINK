# FounderLink — Frontend Integration Guide

**The one document for frontend development.** The frontend owner builds from it; the backend owner keeps it true.
**For:** the frontend owner (mobile and admin apps) and the backend owner.
**Status:** 4 October. Both apps run on mock data today. This page sets the rules, records the team's decisions, and lists what to change in the frontend so the apps run on the real backend, service by service. Team decision D10 in `docs/TEAM_DECISIONS.md`.

Look-ups only: every endpoint's details are in `backend/README.md`, and what is built and not built is in `docs/FUNDING_FLOW.md` section 7. If this page and the code disagree, fix one of them the same day: never leave them different.

---

## Rules

1. **The backend API is the source of truth for data.** If the frontend and the backend disagree about a field, an endpoint or a value, the frontend adapts. If the backend should change instead, the team agrees it first and the backend changes first.
2. **One change, one place, one message.** A pull request that changes a request or response shape updates this page and `backend/README.md` in the same pull request, and the author tells the other owner in the team chat.
3. **No mock data in the running apps.** Mocks stay only for automated tests.
4. **Map field names in one place:** inside the service layer (section 1). Screens never see API names.
5. **The app never invents values.** Every list (sectors, stages, counties, roles, statuses) comes from `GET /meta/options` or section 5, sent exactly as spelled there.
6. **Pull before you push.** Four people push to `main`: `git pull` right before every `git push`.
7. **One language.** Every concept has one name, listed in `docs/PRODUCT.md` section 9: in code, in the API, in docs and on screen. A circle is never a "group", a contribution is never a "deposit", a band is never a "%". What the product is, end to end, is in `docs/PRODUCT.md`.

## Team decisions

Agreed on 4 October:

1. **No wallet, no escrow.** No balance, deposit, withdrawal, release request or approval, and no FounderLink bank account or Paybill, in either app. FounderLink never receives, holds or moves money. Details in section 4.
2. **No ID collection.** No ID or passport number and no ID document, anywhere. Identity is checked by an admin. Business documents for vetting are allowed (section 3).
3. **The apps run on the real backend**, following this page.
4. **New screens first:** funding matches, profile fit, compliance, deals (section 6).
5. **No "funds raised" or "% raised".** FounderLink does not raise money, and showing it reads like crowdfunding, which is regulated.
6. **Core scope: founders, investors and experts (D11).** Funding comes from investors only: angels, VC funds and accelerators that invest. No grants, government funds, bank loans or SACCOs, for now.
7. **Startups only (D11).** No SME onboarding path, for now. Every founder signs up with `journey_type: "startup"`.
8. **The bank is where the money goes (D11).** When a deal closes, the money moves between investor and founder through a bank, never through FounderLink. Screens that mention money say so.
9. **Verification in levels (D12).** Join in two minutes; verify when she first tries to connect or message; share documents when a deal reaches due diligence. Section 2.1.
10. **AI document pre-checks (D12).** Uploaded documents show "AI pre-checked" and then "Confirmed by FounderLink" once an admin confirms. Never "AI-verified".

Still open, with recommendations: section 9.

---

In the tables below:

- **Ready** means the backend has it today.
- **Coming** means the backend owner is adding it. Build against the shape shown and it will work when it lands.
- **Blocked** means a team decision is needed first (section 9).

---

## 0. First: two source folders are missing from the repo

The root `.gitignore` was a Python template and ignored every folder named `lib/`. So `admin/src/lib/` and `mobile/src/lib/` were never pushed, and neither app runs from a fresh clone: `@/lib/utils`, `@/lib/auth/config`, `lib/application-store` and `lib/validation` are all missing.

The `.gitignore` is fixed (`lib/` is now `/lib/`). The frontend owner still has to push the folders from her machine:

```bash
git pull
git add admin/src/lib mobile/src/lib
git commit -m "fix: add the lib folders the gitignore left out"
git push
```

---

## 1. How to call the backend

| | |
|---|---|
| Base URL | `http://localhost:8000` locally. Put it in one config value |
| Auth | `Authorization: Bearer <token>` on every call except sign-up, login and `/meta/options` |
| Token | One token, valid 7 days. Login and sign-up also return `expires_at` (milliseconds). There is no refresh token: drop `refreshToken` and `refreshSession`, and send the user to login on a `401` |
| Field names | The backend uses `snake_case` (`full_name`, `funding_amount_kes`). Map to your `camelCase` types inside the service layer, so screens do not change |
| Errors | Always `{ "error": { "code", "message" } }`. Validation errors add `fields: [{ path, message }]`, which maps onto form fields |
| Live updates | WebSocket at `/ws`, one for the whole app. Send `{"type":"auth","token":"..."}` first. It pushes `{"type":"message",...}` and `{"type":"notification",...}`. Connect as soon as she is signed in: notifications arrive before approval, chat only after |
| IDs | UUID strings |
| Money | Whole Kenyan shillings, integer, field name ends in `_kes` |
| Dates | ISO 8601 strings, UTC |
| Not answered | `null`, never `""` or `0` |
| Language | The member's `preferred_language` (`en` or `sw`), section 7 |
| AI answers | `engine` is `ai_service` or `stand_in`. For the team and demos, never shown to members |
| Fit | Shown as a band (`strong`, `good`, `possible`), never as a percentage |

**Never in any request, response or screen:** ID or passport numbers, ID documents, bank or M-Pesa PINs, a member's contact details before both accept a connection, a "success" percentage for a business.

Error codes worth handling by name:

| Code | Status | Show |
|---|---|---|
| `APPROVAL_REQUIRED` | 403 | "Available once your account is approved", with a link to her application status |
| `CONSENT_REQUIRED` | 409 | The consent screen |
| `PROFILE_REQUIRED` | 409 | Send her to onboarding |
| `EMAIL_NOT_VERIFIED` | 409 | The "enter the code we emailed you" screen |
| `WRONG_CODE`, `CODE_EXPIRED` | 400 | "That code is not right" or "ask for a new code". The same for email, phone and admin 2FA |
| `TOO_MANY_ATTEMPTS` | 429 | "Too many tries. Ask for a new code" |
| `VALIDATION_ERROR` | 400 | Mark the fields in `fields` |

`mobile/src/services/index.ts` already assigns a mock to each service. Write an HTTP version of each beside the mock and switch the assignment. Sections 3 and 8 map every method.

---

## 2. The sign-up flow changes: account first

**Today in the app:** apply with no account → admin approves → email with a User ID and temporary password → set a new password at first login.

**Change to (D12, verification in levels):** sign up in about two minutes → short onboarding → explore → verify **when she first presses Connect or Message** → share documents **when a deal reaches due diligence**.

Why: people give up when asked for documents before they see any value, and scams happen at contact, not while browsing. The backend also cannot issue credentials by email.

| Screen today | Change |
|---|---|
| `/founder-application`, `/investor-application` | Split. **Sign up** (name, email, password, role) and a short **onboarding** come first. The **vetting application** (phone, statement, organisation) becomes a "Verify to connect" step shown when she first tries to connect or message, and a "Verify now so you're ready" card on her profile. **Documents move to the deal's due-diligence step** (level 3) |
| Login with "email or User ID" | Email only. Remove User IDs (`FL-FND-...`, `FL-INV-...`) |
| "Set new password" on first login, `mustChangePassword` | Remove. She chose her password at sign-up |
| Email code at sign-up | Keep. Sign-up returns a token straight away, so she is signed in while she types the code. She cannot submit her vetting application until the address is verified (`EMAIL_NOT_VERIFIED`) |
| Forgot password with a code | Keep. Two steps, not three: ask for the code, then send the code with the new password |
| "Check status" with email and reference number | Replace with a status screen for the signed-in user: `GET /vetting/application` |
| *(new)* Consent screen in onboarding | Add. See 2.2 |
| *(new)* "Verify to connect" step and "Verify now" card | Add. See 2.1 |

### 2.1 The three levels (D12)

| Level | When | She gives | She can use |
|---|---|---|---|
| **1. Join** | Sign-up | Email (verified), password, role, short profile | Her matches, with **other members anonymised** ("Health-tech startup, Nairobi, MVP, seeking KSh 1M": no names or contact), compliance checklist, Ask Compliance, notifications, settings, consents, data export |
| **2. Verified member** | First Connect or Message, or "Verify now" | Phone code, statement, organisation and website (investors), professional register (experts). An admin approves | Named profiles, connections and join requests, chat, circles, opening a deal, the expert directory |
| **3. Deal-ready** | Her deal reaches due diligence | Business documents (founder), organisation or fund documents (investor), identity through a provider. The AI pre-checks each document | Moving the deal to terms agreed and closing |

A call she is not yet allowed to make returns `403` with code `APPROVAL_REQUIRED`: show the "Verify to connect" step, not an error. While an admin reviews her (`submitted` or `in_review`), show "We're checking your details. You can keep exploring."

*Backend status:* today the backend still checks approval on more endpoints than level 2 needs, and does not yet anonymise profiles or require level 3 before terms. Those are on the backend owner's D12 change list (`docs/TEAM_DECISIONS.md`).

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
| `eligibility_attributes` | *Don't ask for now (D11).* It was for grants and government funds | She may set women-, youth- or PWD-owned |
| `contact` | "Contact me by SMS or WhatsApp" | SMS notifications |

`GET /me/consents` lists them. `POST /me/consents` with `{ purpose, granted }` sets one.

---

## 3. Mobile services, method by method

### AuthService

| Method | Backend | Status |
|---|---|---|
| `login({ identifier, password })` | `POST /auth/login` with `{ email, password }` → `{ token, user }` | Ready |
| `signupFounder(input)` | `POST /auth/register` with `{ email, password, full_name, role }`. `role` is `founder`, `investor` or `expert`. Phone is set afterwards with `PATCH /me` | Ready |
| `verifyEmailOtp(email, otp)` | `POST /auth/email/verify` with `{ code }`, signed in. Sign-up sends the code; `POST /auth/email/code` sends a new one | Ready |
| `requestPasswordReset`, `verifyResetOtp`, `resetPassword` | `POST /auth/password/forgot` with `{ email }`, then `POST /auth/password/reset` with `{ email, code, new_password }`. There is no separate "check the code" call: the reset call checks it | Ready |
| `setNewPassword` | Remove | |
| `refreshSession` | Remove | |
| `logout()` | No call. Delete the stored token | |

`SessionUser` maps from `GET /me`: `id`, `role`, `email`, `full_name` → `fullName`, `phone`, `approval_status`. Drop `userId` and `mustChangePassword`. `founderOnboardingComplete` is `founder_profile !== null`.

### FounderService

| Method | Backend | Status |
|---|---|---|
| `getProfile()` | `GET /me` → `founder_profile` | Ready |
| `saveOnboardingStep(step, data)` | `PUT /me/profile` once, at the end, with the whole profile. Keep the steps in the app's own store until then | Ready |
| `getDocuments()` | `GET /vetting/application` → `documents`, each with `status` (`uploaded`, `verified`, `rejected`) and `rejection_reason` | Ready |
| `getDashboard()` | Compose from `GET /me`, `GET /funding/matches`, `GET /compliance` and `GET /connections` | Ready |
| `getInvestorRequests()` | `GET /connections`, the ones with `direction: "received"` and `status: "pending"`. Each has `with.full_name`, `with.organisation_name`, `with.focus_areas`, `pitch`, `vision`, `offer` and `proposed_amount_kes` | Ready |
| `respondToInvestorRequest(id, approve, reason)` | `PATCH /connections/:id` with `{ status: "accepted" | "declined", reason? }`. The reason is shown to the investor | Ready |

Founder profile fields:

| Your field | Backend field | Note |
|---|---|---|
| `businessName` | `business_name` | |
| `sectorId` | `sector` | Use the backend's values, section 5 |
| `stage` | `stage` | Same four values. Startup path only |
| `county` | `county` | The county name |
| `description` | `description` | |
| `fundingTargetKes` | `funding_amount_kes` | |
| `yearStarted`, `website`, `socialLinks` | `year_started`, `website`, `social_links` | Ready. Links must be full URLs |
| `profileCompleteness` | `profile_completeness` | Ready. A whole percentage, on `GET /me` and the `PUT /me/profile` response |
| `fundsRaisedKes` | *(none)* | Removed (team decision 5): don't show |
| `onboardingStep`, `onboardingComplete` | *(none)* | Keep in the app |

**Add to onboarding, because matching needs them:**

| Field | Values |
|---|---|
| `journey_type` | Always send `startup`. Don't ask: SMEs are out of scope for now (D11) |
| `business_status` | `idea`, `informal`, `registered_business_name`, `limited_company` |
| `instruments` (startup) | Any of `equity`, `convertible_note`, `loan`, `grant` |
| `months_trading`, `monthly_revenue_band` | Don't ask: SME-only, out of scope for now (D11) |
| `has_employees`, `handles_personal_data` | Yes or no. They decide which compliance items apply |
| `already_have` | Tick list from `GET /compliance/items` |
| `women_owned`, `youth_owned`, `pwd_owned` | Don't ask for now (D11) |

The founder can also type a description and have the form filled in: `POST /me/profile/extract` with `{ text, language }` returns suggested fields for her to confirm.

### InvestorService

| Method | Backend | Status |
|---|---|---|
| `getProfile()` | `GET /me` → `investor_profile` and `funder` | Ready |
| `saveMatchingQuestionnaire(data)` | Two calls: `PUT /me/investor-profile` (organisation, job title, bio) and `PUT /me/funder` (what she funds) | Ready |
| `discover(params)` | `GET /investor/matches?search=&sector=&stage=&county=&sort=`. `sort` is `fit` (default), `amount_high`, `amount_low` or `newest`. Before approval it returns a count only: show "N businesses match your fund" | Ready |
| `getFounderPublicProfile(id)` | `GET /profiles/:id` | Ready |
| `submitJoinRequest(founderId, payload)` | `POST /connections` with `{ user_id, pitch, vision, offer, proposed_amount_kes }`. Send the amount as a number | Ready |
| `getJoinRequests()` | `GET /connections`, the ones with `direction: "sent"` | Ready |
| `withdrawJoinRequest(id)` | `DELETE /connections/:id`. Only while it is unanswered. She can ask again after withdrawing, but not after a decline | Ready |

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
| `matchReasons` | `match_reasons`: sentences written for the investor, e.g. "In a sector you fund: health" |
| `verifiedDocumentsBadge` | Use `ready`: she already meets everything this funder requires |
| `percentRaised` | Removed (team decision 5): don't show |

Show `band` (`strong`, `good`, `possible`) as the match strength. Never show a percentage.

`RequestStatus` maps to the connection `status`: `pending`, `accepted` (your `approved`), `declined`, `withdrawn`.

### InvestorApplicationService and the founder application

Both become the vetting application of the signed-in user:

| Method | Backend | Status |
|---|---|---|
| `saveDraft(step, data)` | `PATCH /vetting/application` with any of `phone`, `organisation_name`, `organisation_website`, `statement`, `references` | Ready |
| `submit(data)` | `POST /vetting/application/submit` | Ready |
| `checkStatus(email, ref)` | `GET /vetting/application` → `approval_status` and `application.decision_reason` | Ready |
| Document upload | `POST /vetting/application/documents` as `multipart/form-data` with a `file` and a `type`. PDF, JPEG or PNG, up to 5 MB, at most 10. `DELETE /vetting/application/documents/:id` removes one. Both only before she submits | Ready |

There is no reference number. Do not collect an ID number or an ID document: the backend stores none.

Document `type` is one of `business_registration`, `kra_pin_certificate`, `organisation_proof`, `professional_certificate`, `track_record`, `other`. Map `DocumentStatus` as: `not_uploaded` is "no document of that type", `uploaded` and `under_review` are `uploaded`, and `verified` and `rejected` are the same. A file is deleted 30 days after the decision; its row then has `deleted_at` set.

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

`GET /meta/options` returns every list: `sectors`, `stages`, `counties`, `instruments`, `revenue_bands`, `business_statuses`, `funder_kinds`, `signup_roles`, `consent_purposes`. Each list is there twice: the bare values at the top level, and under `labels` as `{ id, label }` pairs for dropdowns, e.g. `labels.sectors`.

### GroupService

`getTransactions`, `deposit`, `submitWithdrawal`, `getWithdrawal` and `approveWithdrawal`: **remove** (team decision 1, section 4).

The rest of the group screens are **blocked** on one open question: whether a group becomes a circle or a deal (section 9). Section 4 lists the circle endpoints that replace the money screens.

---

## 4. The money screens are removed

Team decision 1: FounderLink never receives, holds or moves money, so these screens are **removed**, not reworded:

| Remove | Mobile | Admin |
|---|---|---|
| "Group balance" | `group/[id]/(tabs)/finance.tsx` | |
| Deposit | `group/[id]/deposit.tsx` | |
| Withdrawal request, tracker and approval | `group/[id]/withdrawal/*`, `group/[id]/withdrawal-approve/*` | `withdrawals` page |
| Transactions | `GroupService.getTransactions` | `transactions.service.ts` |
| "FounderLink Escrow" Absa account and Paybill | `ABSA_DEPOSIT_DETAILS` in `kenya-data.ts` | |

What a money circle's finance tab shows instead, all from the real API:

| Show | Backend |
|---|---|
| Contributions recorded, per member and goal | `GET /circles/:id/contributions`; the organiser or treasurer adds one with `POST /circles/:id/contributions` |
| Who has paid and who still owes this period | `GET /circles/:id/reconciliation` |
| Upload an M-Pesa statement to match payments | `POST /circles/:id/statements` (organiser or treasurer) |
| The circle's **own** Paybill or Till, where members pay | `paybill_number` on `GET /circles/:id`; set with `PATCH /circles/:id` |
| Goals and progress | `GET /circles/:id` → goals |
| Decisions about the circle's own money | Votes: `/circles/:id/decisions` |

Every money circle screen carries: "FounderLink records contributions. It never holds or moves your money."

---

## 5. Use the backend's values

Matching compares exact values, so the app has to send these, not its own labels. Read lists from `GET /meta/options` where they exist there.

| List | Values |
|---|---|
| Sectors | `health`, `agri`, `fintech`, `climate`, `retail`, `education`, `logistics`, `other` |
| Stages | `idea`, `mvp`, `early_revenue`, `growth` |
| Counties | The 47 county names, e.g. `Nairobi`, `Mombasa` |
| Roles | `founder`, `investor`, `expert`, `admin` (one admin role). Your `UserRole` has no `expert` yet |
| `approval_status` | `draft`, `submitted`, `in_review`, `needs_info`, `approved`, `rejected`, `suspended`, `banned` |
| `journey_type` | `startup` (the only value for now, D11) |
| Funder `kind` | `angel`, `vc`, `accelerator` (investors only, D11) |
| `business_status` | `idea`, `informal`, `registered_business_name`, `limited_company` |
| `instruments` | `equity`, `convertible_note`, `loan`, `grant` |
| Connection `status` | `pending`, `accepted`, `declined` (withdrawn with `DELETE`) |
| Deal `type` | `cofounder_partnership`, `investment`, `expert_engagement`, `joint_venture` |
| Deal `stage` | `exploring`, `due_diligence`, `terms_agreed`, `documents_compliance`, `closed`, `active` |
| Circle `type`, member `role` | `money`, `learning`; `organiser`, `treasurer`, `member` |
| Compliance `status` | `not_started`, `in_progress`, `complete` |
| Vetting document `type` | `business_registration`, `kra_pin_certificate`, `organisation_proof`, `professional_certificate`, `track_record`, `other` |
| Consent `purpose` | `profile_visibility`, `ai_matching`, `eligibility_attributes`, `contact` |

---

## 6. Screens the app does not have yet

The backend has these and the app has no screen for them. In order of importance for the demo:

| # | Screen | Backend | Why it matters |
|---|---|---|---|
| 1 | **Investor matches**: three lists, "Pitch", "Pitch after you fix this", "Don't pitch" | `GET /funding/matches` | This is the pitch. Investors and accelerators only (D11). Each card has a `band`, an `explanation`, `gaps` and `risk_factors` |
| 2 | **Compliance checklist** with status per item | `GET /compliance`, `PATCH /compliance/:item_id/status` | Completing an item closes the matching gap in screen 1 |
| 3 | **Ask Compliance** | `POST /compliance/ask` | Shows cited answers, or "cannot confirm" with experts to go to |
| 4 | **Consent** and **waiting for approval** | Section 2 | Required by the new flow |
| 5 | ~~SME onboarding path~~ | | Out of scope for now (D11): don't build |
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
| Login | `POST /auth/login` with an admin account. If she has two-step sign-in on, the answer is `{ two_factor_required: true, pending_token }` and no session yet | Ready |
| Verify 2FA | `POST /auth/2fa/verify` with `{ pending_token, code }` → `{ token, user }`. The code comes from her authenticator app | Ready |
| Set up 2FA *(new page)* | `POST /auth/2fa/setup` → `{ secret, otpauth_url }`. Show `otpauth_url` as a QR code. Then `POST /auth/2fa/enable` with `{ code }` | Ready |
| Founder and investor applications (list) | `GET /admin/vetting/queue`: waiting applications, riskiest first. `GET /admin/vetting/applications?role=&status=&page=` lists every application, decided ones included | Ready |
| Application detail | `GET /admin/vetting/:id` | Ready |
| Approve, reject | `POST /admin/vetting/:id/decision` with `{ decision, reason, checks }` | Ready |
| Document status | Documents are on `GET /admin/vetting/:id`. `GET /admin/vetting/documents/:id/file` downloads one (admins only). `PATCH /admin/vetting/documents/:id` with `{ status: "verified" | "rejected", reason }` | Ready |
| Founders, investors (lists and detail) | `GET /admin/users?role=&status=&search=&page=&page_size=` → `{ items, total, page, pages }`. `GET /admin/users/:id` is one member with her profiles, application, reports against her and a `timeline` | Ready |
| Update a member's status | `POST /admin/users/:id/suspend` and `/reinstate`, each with `{ reason }` | Ready |
| Audit log | `GET /admin/actions` | Ready |
| Reports | `GET /admin/reports` → `{ messages, members }` | Ready |
| Admin users | `GET /admin/admins` lists them. `POST /admin/admins` with `{ email, full_name, password }` creates one. The password needs 12 or more characters | Ready |
| Dashboard numbers and charts | `GET /admin/stats`: members by role and status, applications waiting, re-checks due, reports, deals by stage, circles, and `registrations` for the last six months. There are no transaction volumes: the backend records no money moving | Ready |
| Withdrawals, transactions | | Removed (team decision 1, section 4) |
| Groups | `GET /circles` and `/deals` lists, once section 9 question 1 is decided | Blocked, section 9 |

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

**Decided on 4 October:** how "the bank holds the money" works. It doesn't: there are no deposits, withdrawals or releases at all (team decision 1, section 4).

Still open. These block the group screens on both sides:

| # | Question | Recommendation |
|---|---|---|
| 1 | **What a group is.** In the app a group is one founder plus the investors she approved. The backend has a **circle** (peers saving together, with contributions, votes and a chat) and a **deal** (a founder and one or more investors, with stages, terms and a room). Which one do the group screens sit on? | **Split it.** Founders saving together are a circle. A founder working with investors is a deal. Move each group screen to the one it belongs to |
| 2 | **What accepting a join request creates:** a connection only, or a deal as well | **A connection only.** The two chat, and either opens a deal when they decide to work together |
| 3 | **Which app is shown in the demo:** mobile, admin or both | **Both:** mobile for the founder and investor journeys, admin for vetting (the fake-investor rejection) |

When the team decides, write the answer here and in `docs/TEAM_DECISIONS.md` D10, and remove the "Blocked" marks above.

---

## 10. Integration is done when

- [ ] `admin/src/lib` and `mobile/src/lib` are in the repo, so a fresh clone runs (section 0)
- [ ] The mobile and admin services call the real API: no mocks in the running apps
- [ ] No wallet, balance, deposit, withdrawal, escrow, ID field or "% raised" anywhere in the apps
- [ ] Every value sent comes from section 5 or `/meta/options`
- [ ] Every screen handles `401`, `APPROVAL_REQUIRED`, `PROFILE_REQUIRED`, `CONSENT_REQUIRED` and `EMAIL_NOT_VERIFIED`
- [ ] Funding matches, profile fit, compliance and deals screens exist and use the real API (section 6)
- [ ] The demo accounts are approved and have the `ai_matching` consent, and answers show `engine: "ai_service"` with the AI service running
- [ ] The founder and investor journeys pass end to end against the real backend (`docs/E2E-TESTING.md`)
