# Internal AI service called by the Node.js backend (TEAM_DECISIONS D8).
# Run from the repository root:
#   uvicorn ai.service.main:app --port 8001

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ai.embeddings.model import load_embedder
from ai.service.routes import matching

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model once at start-up: the backend gives up after 8 seconds,
    # so it must never be loaded during a request.
    app.state.embedder = load_embedder()
    yield


app = FastAPI(title="FounderLink AI service", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    embedder = app.state.embedder
    return {"status": "ok", "embedding_model": embedder.model_name if embedder else None}


app.include_router(matching.router)
