# Measures the message scam check on the labelled examples, against the
# backend's stand-in rules (backend/src/ai/standin.ts, checkMessage).
# Run from the repository root:  python -m ai.evaluation.eval_moderation
#
# The examples were written by the team, in English, Swahili and Sheng.
# Add real (anonymised) messages as the platform gets them.

import json
import re
import time
from pathlib import Path

from ai.moderation.payment_request_detector import check_message

DATASET = Path(__file__).parent / "datasets" / "scam_examples.jsonl"


def standin(text: str) -> bool:
    """The backend's stand-in, ported line for line, as the baseline."""
    reasons = []
    if re.search(r"(processing|registration|facilitation|upfront|application|commitment) fees?", text, re.I):
        reasons.append("fee")
    if re.search(r"send (me |us )?(the |some |your )?money|tuma (pesa|hela)", text, re.I):
        reasons.append("asks")
    if re.search(r"m-?pesa|paybill|till (number|no)|pochi", text, re.I) and re.search(
            r"(\+?254|0)[17]\d{8}|\b\d{5,7}\b", text):
        reasons.append("details")
    return bool(reasons)


def score(predict, rows) -> dict:
    tp = sum(1 for r in rows if r["scam"] and predict(r["text"]))
    fn = sum(1 for r in rows if r["scam"] and not predict(r["text"]))
    fp = sum(1 for r in rows if not r["scam"] and predict(r["text"]))
    tn = sum(1 for r in rows if not r["scam"] and not predict(r["text"]))
    return {
        "caught": f"{tp}/{tp + fn}",
        "recall": round(tp / (tp + fn), 3) if tp + fn else None,
        "false_alarms": f"{fp}/{fp + tn}",
        "false_alarm_rate": round(fp / (fp + tn), 3) if fp + tn else None,
    }


def main() -> None:
    rows = [json.loads(line) for line in DATASET.read_text(encoding="utf-8").splitlines() if line.strip()]
    ours = lambda t: check_message(t)["flagged"]  # noqa: E731

    print(f"{len(rows)} labelled messages ({sum(r['scam'] for r in rows)} scam-style)\n")
    for name, predict in (("FounderLink AI", ours), ("Backend stand-in", standin)):
        print(f"{name:18} {score(predict, rows)}")
    for lang in ("en", "sw", "sheng"):
        subset = [r for r in rows if r["lang"] == lang]
        print(f"  {lang:5} AI {score(ours, subset)}   stand-in {score(standin, subset)}")

    misses = [r for r in rows if r["scam"] != ours(r["text"])]
    if misses:
        print("\nWhere the AI is wrong:")
        for r in misses:
            print(f"  {'missed' if r['scam'] else 'false alarm':11} {r['text']}")

    started = time.perf_counter()
    for _ in range(20):
        for r in rows:
            check_message(r["text"])
    per_message_ms = (time.perf_counter() - started) * 1000 / (20 * len(rows))
    print(f"\nSpeed: {per_message_ms:.2f} ms per message")


if __name__ == "__main__":
    main()
