# Reads the project's .env file into the environment, so the AI service is
# set up in the same place as everything else (LLM_API_KEY, LLM_MODEL,
# AI_SERVICE_API_KEY, ...). A variable already set in the environment wins,
# so Docker and the hosting platform can still override any value.
#
# AI_ENV_FILE names another file, or "none" to read no file (the tests).

import logging
import os
from pathlib import Path

log = logging.getLogger(__name__)

DEFAULT_FILE = Path(__file__).resolve().parents[2] / ".env"


def _value(raw: str) -> str:
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        return raw[1:-1]
    # An unquoted value ends at " #": KEY=value  # comment
    return raw.split(" #", 1)[0].strip()


def load_env_file(path: str | Path | None = None) -> list[str]:
    """Sets each KEY=value from the file that is not already set. Returns the
    names it set. Values are never logged."""
    chosen = path if path is not None else os.getenv("AI_ENV_FILE", "")
    if str(chosen).lower() == "none":
        return []
    file = Path(chosen) if chosen else DEFAULT_FILE
    if not file.is_file():
        return []
    loaded = []
    for line in file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw = line.split("=", 1)
        key = key.removeprefix("export ").strip()
        value = _value(raw)
        # An empty value is a blank in the template, not a setting.
        if not key or not value or key in os.environ:
            continue
        os.environ[key] = value
        loaded.append(key)
    if loaded:
        log.info("Read %d settings from %s", len(loaded), file)
    return loaded
