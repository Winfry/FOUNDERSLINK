import hmac
import logging
import os

from fastapi import Header, HTTPException

log = logging.getLogger(__name__)

# The service is internal: only the backend, which holds the shared key,
# may call it. With no key set (local development) every call is allowed.
API_KEY = os.getenv("AI_SERVICE_API_KEY", "")

if not API_KEY:
    log.warning("AI_SERVICE_API_KEY is not set: the AI service accepts calls without a key")


def require_api_key(x_internal_api_key: str = Header(default="")) -> None:
    if API_KEY and not hmac.compare_digest(x_internal_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing internal API key")
