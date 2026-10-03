# FounderLink backend

Node + Express + TypeScript + Prisma, on PostgreSQL. Covers auth and founder onboarding so far. See `docs/FUNDING_FLOW.md` for what comes next.

## Run it

```bash
cd backend
npm install
cp ../.env.example .env          # set DATABASE_URL to a Postgres database and JWT_SECRET (16+ characters)
npm run db:migrate               # creates the tables
npm run db:generate              # generates the Prisma client
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

Send the token as `Authorization: Bearer <token>`.

Errors always look like `{ "error": { "code", "message" } }`. Validation errors also carry `fields: [{ path, message }]`.
