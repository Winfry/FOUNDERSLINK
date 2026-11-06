# FoundersLink AI service

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
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-small` | Multilingual model for mandate matching and Ask Compliance search. `none` turns embeddings off. |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | empty | The LLM that writes Ask Compliance answers. Without a key, the best official passage is quoted instead. |
| `LLM_REASONING_EFFORT` | empty | For models that think before answering (Gemini 2.5 and later): `low` keeps answers within the time limit. Sent only when set. |
| `AI_ENV_FILE` | the root `.env` | The settings file the service reads at start. `none` reads no file (the tests do this). |

## Ask Compliance

A founder asks a question in the app ("Do I need a KRA PIN?"). The service finds the passages of the official Kenyan sources in `data/compliance/` that speak to it, and an LLM writes a short answer **from those passages only**, citing each fact with its source and the date FoundersLink last checked it (TEAM_DECISIONS D3). The rules the LLM follows are in `ai/compliance_rag/prompts/answer_with_citations.txt`.

What the founder sees depends on what is set up:

| Set up | The founder sees |
|---|---|
| Index and an LLM | A plain answer, every fact cited, with the source's "Checked" date |
| Index, no LLM (or the LLM fails or is slow) | "From the official source": the closest passage, word for word, with its source, and an expert suggested |
| Nothing official matches the question | "No official source for this yet". Nothing is guessed |
| The AI service is not running | The backend's own stand-in, which can only say it cannot confirm |

An LLM's answer is shown only if every fact carries a citation and every number in it appears in the source it cites. Otherwise the founder gets the honest "not found".

### Set it up on a machine (once)

From the repository root, with the venv active:

```bash
python -m scripts.fetch_compliance_sources   # downloads the official PDFs (git ignores them)
python -m ai.compliance_rag.ingest           # builds the search index in ai/compliance_rag/index/
```

Then put the LLM in the root `.env`. The service reads that file itself, and any variable already set in the environment wins. Any provider with an OpenAI-style `/chat/completions` endpoint works:

```
LLM_BASE_URL=<the provider's OpenAI-compatible URL>
LLM_API_KEY=<your key>
LLM_MODEL=<the model name the provider gives>
```

Start the service and check `GET /health`: `"compliance_index": true` and `"llm": true`. If the embedding model is already downloaded and the machine is offline, start it with `HF_HUB_OFFLINE=1` so it does not wait for the internet.

Every question and answer is stored by the backend (`compliance_questions`), with the founder's "Did this help?" answer, so answers can be checked and improved.

## Endpoints

| Endpoint | What it does |
|---|---|
| `GET /health` | Liveness, plus which embedding model is loaded |
| `POST /extract-profile` | Free text (English, Swahili, Sheng) → onboarding fields, using only the allowed values in `ai/extraction/options.py` |
| `POST /recommend` | Profile + candidate funders → a verdict for **every** candidate: band, score (sorting only), signals, explanation |
| `POST /explain-fit` | Profile + one funder + its track record (no company names) + language → the profile page: the same band as the match card, one component per signal, reasons in English or Swahili, and track-record highlights labelled by source (`docs/FUNDING_FLOW.md` §4.3) |
| `POST /documents/precheck` | A business registration or KRA PIN certificate (base64) + the profile's business name → `{ fields, checks, concerns, readable }`: the name, PIN or registration number and date it found, and what an admin should look at (TEAM_DECISIONS D12) |
| `POST /deals/due-diligence-pack` | A deal and its parties → for each party, what is confirmed, what is only uploaded or self-reported, and what is missing, plus a summary in English or Swahili |

### Sheng and spoken Swahili

Before extraction, `ai/extraction/sheng.py` rewrites Sheng words and spoken amounts into plain words and digits: "Niko na biz ya mtumba, nataka ngiri hamsini" becomes "niko na biashara ya mitumba, nataka 50000". It reads amounts such as "laki mbili na nusu" (250,000) and "milioni moja na laki tano" (1,500,000).

The words live in `ai/extraction/lexicons/sheng.json`, so anyone can add one without touching code. Add a word only when you are sure of its everyday meaning, and add a test in `ai/tests/test_sheng.py`. Other parts of the AI can reuse it: `from ai.extraction.sheng import normalise`.

### Document pre-checks

`ai/documents/` reads PDFs that have a text layer, such as certificates downloaded from eCitizen or iTax. Photos and scans need OCR, which runs only if Tesseract and `pytesseract` are installed; otherwise the document comes back `readable: false` and an admin reviews it by hand. Nothing is guessed, and nothing is ever called "verified": the label is "AI pre-checked", until an admin confirms. Files never leave the service.

Sample certificates, all stamped as demo documents: `python -m scripts.make_demo_documents` writes them to `data/demo-documents/` (PDFs are git-ignored, so regenerate them on each machine). Two pass every check for a founder whose business is "Afya Booking Ltd"; two show the AI flagging a wrong name and an edited PDF.

All founder-facing sentences live in `ai/explanations/messages.py`, in English and Swahili. The Swahili needs a native speaker's review before the demo.

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

1. Re-measure `MANDATE_HIGH` and `MEANING_SHARE` in `ai/ranking/weights.py` with `python -m ai.evaluation.eval_matching --embed` whenever the model or the investor data changes.
2. Fill `ai/evaluation/datasets/labelled_matches.jsonl` and measure precision@10 for this service against the backend's stand-in rules.
3. Add an LLM pass to `/extract-profile` for descriptions the rules miss.
