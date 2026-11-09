# FOUNDERSLINK
FoundersLink is an AI-powered ecosystem for early-stage and under-networked African founders. It helps a founder discover relevant people, understand what to do next, find suitable opportunities, organise collective financial goals, and connect to appropriate financial services.  The central insight is fragmentation.

## Repository layout

| Folder | What lives here | Owner |
|---|---|---|
| `frontend/` | Web/mobile app (stack to be confirmed) | Full-stack 1 |
| `backend/` | **Node.js** API, database, auth, vetting and admin approval, real-time messaging, deals | Full-stack 2 |
| `ai/` | Internal Python AI service (`ai/service`): matching, explanations, compliance RAG, scam detection, vetting risk signals, evaluation | AI/ML 1 and 2 |
| `data/` | Seed profiles, opportunities, compliance sources (national, county, deal) | AI/ML 1 and 2 |
| `scripts/` | Seeding, compliance ingestion, embedding builds | Shared |
| `docs/` | Spec, Kenya amendments, team decisions | Shared |

## Run it on your computer

With Docker Desktop running (it holds the database), from this folder:

```
npm run start:all
```

It starts the AI service, the backend, the staff dashboard (http://localhost:3000) and the app, whose QR code you scan with Expo Go. The app also runs in a web browser: http://localhost:8081 on this computer, or `http://<this computer's Wi-Fi address>:8081` on a phone on the same Wi-Fi (the command prints the address). Ctrl+C stops everything. Anything already running in another terminal is left alone. `npm run start:all -- --check` only checks and says what it would start; `-- --no-ai` leaves the AI service out.

Ask Compliance writes answers about a minute after the start, once the line `Ask Compliance is ready` appears (`ai/README.md`).

Start with `docs/TEAM_DECISIONS.md`. Copy `.env.example` to `.env` for local secrets; never commit `.env`.
