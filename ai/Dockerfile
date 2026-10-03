FROM python:3.12-slim

WORKDIR /app
COPY ai/requirements.txt ai/requirements.txt
RUN pip install --no-cache-dir -r ai/requirements.txt

COPY ai ai

# Download the embedding model at build time so start-up is fast.
ARG EMBEDDING_MODEL=intfloat/multilingual-e5-small
ENV EMBEDDING_MODEL=${EMBEDDING_MODEL}
RUN python -c "import os; from sentence_transformers import SentenceTransformer; SentenceTransformer(os.environ['EMBEDDING_MODEL'])"

EXPOSE 8001
CMD ["uvicorn", "ai.service.main:app", "--host", "0.0.0.0", "--port", "8001"]
