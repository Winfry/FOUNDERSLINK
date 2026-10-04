# FoundersLink E2E & journey testing

> **Out of date since 4 October:** this describes the earlier application-first flow, which was removed. See `docs/FINAL_VERIFICATION.md` for what was tested.

## Shared journey tests (fast, no UI)

Runs application → approve/reject → login logic against the in-memory store used by mobile mocks and admin services.

```bash
cd /home/ogalo/FOUNDERSLINK
npm install
npm run test:journeys
npm run test:mobile:journeys
```

### Covered flows

| Journey | Steps verified |
|--------|----------------|
| **Investor** | Apply → duplicate email blocked → admin approve → email notification → temp User ID login → password change login → discover founders |
| **Founder** | Apply → reject with reason → status + email → apply → approve → FL-FND credentials |
| **Mobile services** | Investor submit + store approve + auth login; founder duplicate email; founder demo groups |

## Admin Playwright (browser)

```bash
cd admin
npm run dev   # or rely on webServer in config
cd ..
npm run test:admin:e2e
```

Tests: login + 2FA → investor application detail (answers, documents, Approve/Reject footer) → founder applications detail.

Env: `PLAYWRIGHT_BASE_URL` optional (default `http://localhost:3000`).

## Mobile Maestro (device UI)

Install [Maestro](https://maestro.mobile.dev/), start the app (`cd mobile && npm start`), then:

```bash
maestro test mobile/e2e/maestro/founder-journey.yaml
maestro test mobile/e2e/maestro/investor-journey.yaml
```

Extend YAML flows after admin approves a test application (use credentials from mock alert / `shared/application-store` notifications in journey tests).

## Founder & investor product flow (summary)

1. **Apply** on mobile (`/founder-application` or `/investor-application`) — **one email per platform account**.
2. **Admin** reviews full payload + **documents** on detail page; **Approve** / **Reject** (reason required) in bottom-right footer.
3. **Approved**: mock **email** with User ID + `TempPass2026!`; user **sets new password** on first login.
4. **Rejected**: mock **email** with reason; user can check status with email + reference.
5. **Founder**: onboarding → dashboard / investors / groups / finance on mobile.
6. **Investor**: matching questionnaire → discover → join request → group deposit (mock).

Replace `shared/application-store` with API calls when backend is ready; keep the same journey tests against HTTP fixtures or contract mocks.
