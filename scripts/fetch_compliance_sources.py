# Downloads every official source listed in data/compliance/sources.json
# into data/compliance/, so the Ask Compliance index can be built.
# Run from the repository root:  python -m scripts.fetch_compliance_sources
#
# PDFs are git-ignored, so each machine runs this once. Files already on
# disk are kept; pass --force to download them again. Nothing is fetched
# while answering a question: only this script touches the network.

import json
import sys
import time
import urllib.request
from pathlib import Path

DATA = Path("data/compliance")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FounderLink-source-fetch"


def fetch(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read(), response.headers.get("Content-Type", "")


def looks_right(path: Path, body: bytes, content_type: str) -> str | None:
    """Why the download is not what the file name promises, or None."""
    if path.suffix == ".pdf" and not body.startswith(b"%PDF"):
        return f"expected a PDF, got {content_type or 'unknown content'}"
    if path.suffix == ".html" and b"<html" not in body[:5000].lower():
        return f"expected an HTML page, got {content_type or 'unknown content'}"
    return None


def main(force: bool) -> int:
    sources = json.loads((DATA / "sources.json").read_text(encoding="utf-8"))["sources"]
    failed = 0
    for src in sources:
        if not src.get("file"):
            continue
        path = DATA / src["file"]
        if path.exists() and not force:
            print(f"have    {src['id']}")
            continue
        url = src.get("download_url") or src["url"]
        try:
            body, content_type = fetch(url)
        except Exception as e:  # network errors, 403s, timeouts
            print(f"FAILED  {src['id']}: {e}")
            failed += 1
            continue
        problem = looks_right(path, body, content_type)
        if problem:
            print(f"FAILED  {src['id']}: {problem}")
            failed += 1
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        print(f"fetched {src['id']} ({len(body) // 1024} KB)")
        time.sleep(1)  # be polite to government servers

    print(f"\n{len(sources) - failed} of {len(sources)} sources on disk.")
    if failed:
        print("Download the failed ones by hand from their url, save them at their file path, "
              "and re-check last_verified_at.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(force="--force" in sys.argv))
