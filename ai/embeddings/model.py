import logging
import os

log = logging.getLogger(__name__)

# Multilingual so Swahili and English descriptions land in the same space.
# Set EMBEDDING_MODEL=none to run without embeddings (tests, slow machines):
# matching then uses the structured signals only.
DEFAULT_MODEL = "intfloat/multilingual-e5-small"


class Embedder:
    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        # e5 models are trained with these prefixes and score worse without them.
        self._e5 = "e5" in model_name.lower()

    def _encode(self, texts: list[str], prefix: str):
        if self._e5:
            texts = [f"{prefix}: {t}" for t in texts]
        return self.model.encode(texts, normalize_embeddings=True)

    def similarities(self, query: str, passages: list[str]) -> list[float]:
        """Cosine similarity between one query and each passage, in [0, 1]."""
        if not passages:
            return []
        q = self._encode([query], "query")[0]
        p = self._encode(passages, "passage")
        # Embeddings are normalised, so the dot product is the cosine.
        return [max(0.0, float(v @ q)) for v in p]


def load_embedder() -> Embedder | None:
    name = os.getenv("EMBEDDING_MODEL", DEFAULT_MODEL)
    if name.lower() == "none":
        log.info("Embeddings disabled: matching uses structured signals only")
        return None
    log.info("Loading embedding model %s", name)
    return Embedder(name)
