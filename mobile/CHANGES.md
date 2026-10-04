# Mobile founder journey rewrite (PRODUCT.md + FRONTEND_INTEGRATION.md)

## Added
- Intro: white logo splash (`app/splash.tsx`), welcome with handshake (`app/welcome.tsx`), native splash in `app.json`
- Account-first auth: `app/auth/signup.tsx`, email-only login, email verify with resend, demo accounts in `mock-store.ts`
- Onboarding: describe business → confirm profile → consents (`app/founder/onboarding/index.tsx`)
- Founder tabs: Matches, Readiness, Connections, Chamas, Profile (`app/(founder)/(tabs)/`)
- Verify to connect + status (`app/founder/verify/`)
- Service layer: funding, compliance, connections, vetting, consents, deals, circles, conversations mocks
- Routes: `app/founder/investor-match/[id].tsx`, `app/deal/[id].tsx`, `app/chama/[id].tsx`, `app/conversations/` (stubs where noted)

## Removed (delete from repo when present)
- Application-first flows: `app/founder-application/**`, `app/investor-application/**`
- User ID login, `mustChangePassword`, `app/auth/set-new-password.tsx`, reference status screens
- Wallet / money movement: `app/group/**/finance.tsx`, `deposit.tsx`, `withdrawal/**`, `GroupService` transactions
- `ABSA_DEPOSIT_DETAILS` and escrow copy in `kenya-data.ts`
- Legacy mocks: `application-store`, `demo-seed`, old `founder.mock` dashboard / platform investors

## Demo logins (password `DemoPass2026!`)
- `amina@healthlink.demo` — verified, matches + deal
- `new@founder.demo` — new, onboarding incomplete
- `waiting@founder.demo` — verification in review
- `needsinfo@founder.demo` — needs more info

## Still to polish
- Full deal stage UI, chama tabs (contributions, votes, who owes), conversation thread UI
- Investor and expert journeys aligned to the same auth model
- Admin dashboard: remove withdrawals/transactions pages (see FRONTEND_INTEGRATION §8)
