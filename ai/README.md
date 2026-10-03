# FounderLink AI service

Internal Python service the Node.js backend calls over HTTP (`docs/TEAM_DECISIONS.md` D8). The contract is `docs/FUNDING_FLOW.md` section 4, checked on the backend side in `backend/src/ai/client.ts`.

## Run it

From the repository root:

```bash
python -m venv ai/.venv
ai/.venv/Scripts/activate            # Windows; on macOS/Linux: source ai/.venv/bin/activate
pip install -r ai/requirements.txt
uvicorn ai.service.main:app --port 8001
```

Then in `backend/.env`:

```
AI_SERVICE_URL=http://localhost:8001
AI_SERVICE_API_KEY=<same value as the AI service's AI_SERVICE_API_KEY>
```

`GET /funding/matches` on the backend should now answer with `"engine": "ai_service"` instead of `"stand_in"`.

| Variable | Default | What it does |
|---|---|---|
| `AI_SERVICE_API_KEY` | empty | Shared key the backend sends as `X-Internal-Api-Key`. Empty means no check (local only). |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-small` | Multilingual model for mandate matching. `none` turns embeddings off. |

## Endpoints

| Endpoint | What it does |
|---|---|
| `GET /health` | Liveness, plus which embedding model is loaded |
| `POST /extract-profile` | Free text (English, Swahili, Sheng) → onboarding fields, using only the allowed values in `ai/extraction/options.py` |
| `POST /recommend` | Profile + candidate funders → a verdict for **every** candidate: band, score (sorting only), signals, explanation |

## Tests

```bash
python -m pytest ai/tests
```

Tests run without the embedding model and use the backend's `backend/data/demo-funders.json`.

## Rules the service must keep

- Answer within 8 seconds, or the backend falls back to its own rules. Load models at start-up only.
- Return every candidate sent, in any order.
- Only return option values from `ai/extraction/options.py`, which must match `backend/src/shared/constants.ts`.

## Next steps

1. Install the embedding model and calibrate `MANDATE_LOW` / `MANDATE_HIGH` in `ai/ranking/weights.py` on real descriptions.
2. Fill `ai/evaluation/datasets/labelled_matches.jsonl` and measure precision@10 for this service against the backend's stand-in rules.
3. Add an LLM pass to `/extract-profile` for descriptions the rules miss.
