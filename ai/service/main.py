# Internal AI service called by the Node.js backend (TEAM_DECISIONS D8).
# Run from the repository root:
#   uvicorn ai.service.main:app --port 8001

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ai.embeddings.model import load_embedder
from ai.service.routes import compliance, documents, matching, moderation, vetting

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def _load_compliance(embedder):
    """Ask Compliance's index and LLM. Either may be missing (index not built
    yet, no LLM key): the service still starts, and /compliance/answer
    answers 503 so the backend uses its stand-in."""
    from ai.compliance_rag.answer import load_chat_client
    from ai.compliance_rag.retrieve import load_retriever

    try:
        retriever = load_retriever(embedder)
    except Exception as e:  # IndexNotReady, or chromadb not installed
        log.warning("Ask Compliance index not loaded: %s", e)
        retriever = None
    return retriever, load_chat_client()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models and indexes once at start-up: the backend gives up after
    # 8 seconds, so nothing slow may happen during a request.
    app.state.embedder = load_embedder()
    app.state.compliance_retriever, app.state.llm = _load_compliance(app.state.embedder)
    yield


app = FastAPI(title="FounderLink AI service", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    state = app.state
    embedder = state.embedder
    return {
        "status": "ok",
        "embedding_model": embedder.model_name if embedder else None,
        "compliance_index": state.compliance_retriever is not None,
        "llm": state.llm is not None,
    }


app.include_router(matching.router)
app.include_router(documents.router)
app.include_router(moderation.router)
app.include_router(vetting.router)
app.include_router(compliance.router)
