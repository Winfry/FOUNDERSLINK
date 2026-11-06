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

Start with `docs/TEAM_DECISIONS.md`. Copy `.env.example` to `.env` for local secrets; never commit `.env`.
