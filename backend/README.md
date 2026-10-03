# FounderLink backend

Node + Express + TypeScript + Prisma, on PostgreSQL. Covers auth, founder onboarding and the funding flow in `docs/FUNDING_FLOW.md`.

## Run it

```bash
cd backend
npm install
cp ../.env.example .env          # set DATABASE_URL to a Postgres database and JWT_SECRET (16+ characters)
npm run db:migrate               # creates the tables
npm run db:generate              # generates the Prisma client
npm run db:seed                  # loads the demo compliance items and funders from data/
npm run dev                      # http://localhost:8000
npm test                         # API tests, against the same database
```

## Endpoints

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/health` | no | Liveness check |
| GET | `/meta/options` | no | Option lists for the onboarding form (sectors, stages and so on) |
| POST | `/auth/register` | no | `{ email, password, full_name }` → `{ token, user }` |
| POST | `/auth/login` | no | `{ email, password }` → `{ token, user }` |
| GET | `/me` | yes | The signed-in user and her `founder_profile` (null until onboarding) |
| PUT | `/me/profile` | yes | Saves the onboarding answers. Fields are in `docs/FUNDING_FLOW.md` section 3 |
| POST | `/me/profile/extract` | yes | `{ text, language? }` → suggested onboarding fields from a typed description. Saves nothing |
| GET | `/compliance/items` | no | The items for the "what you already have" tick list |
| GET | `/funders` | yes | All funder records |
| GET | `/funding/matches` | yes | The founder's funders in three groups: `apply_now`, `apply_after`, `not_for_you` |

Send the token as `Authorization: Bearer <token>`.

Errors always look like `{ "error": { "code", "message" } }`. Validation errors also carry `fields: [{ path, message }]`.

## Funding matches

Each card in `/funding/matches` has:

- `funder`: the record, including `how_to_apply_url`, `source_url` and `last_verified_at`
- `band`: how well the funder fits: `strong`, `good` or `possible`. It is `null` in `not_for_you`
- `explanation`: one or two sentences on why it fits, or why it does not
- `reasons`: the detail behind that, one `{ signal, fits, text }` per signal
- `gaps`: what stands between the founder and this funder. `kind: "requirement"` points at a compliance item; `kind: "unanswered"` points at a profile field she has not filled in
- `risk_factors`: things to check before applying, e.g. an application fee. They never change the group

The response also has `engine`: `ai_service` when the AI service answered, `stand_in` when the backend's own rules did.

## AI service

Set `AI_SERVICE_URL` in `.env` to the AI service's base URL. Set `AI_SERVICE_API_KEY` to the shared key, which is sent as `X-Internal-Api-Key`. The backend calls `POST /extract-profile` and `POST /recommend` on it (shapes in `docs/FUNDING_FLOW.md` section 4). If the variable is empty, or a call fails, times out or returns something invalid, the backend falls back to the rule-based stand-in in `src/ai/standin.ts`.

Emails and phone numbers are removed from the description before it is sent, and the eligibility flags are never sent.

## Data

`npm run db:seed` loads `data/demo-compliance-items.json` and `data/demo-funders.json`. Every record in them is made up and marked `is_demo`. To load real, curated files in the same format:

```bash
npm run db:seed -- path/to/items.json path/to/funders.json
```
