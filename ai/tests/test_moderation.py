# The message scam check. Run: python -m pytest ai/tests

import json
import time
from pathlib import Path

import pytest

from ai.moderation.payment_request_detector import (
    ASKS_MONEY, FEE, PAYMENT_DETAILS, PRESSURE, SECRECY, TOO_GOOD, check_message,
)
from ai.tests.conftest import KEY

DATASET = Path(__file__).resolve().parents[1] / "evaluation" / "datasets" / "scam_examples.jsonl"


@pytest.mark.parametrize("text, reasons", [
    ("Pay the processing fee to Till 845123 to release your grant.", [FEE, PAYMENT_DETAILS]),
    ("Send me the money and keep this between us.", [ASKS_MONEY, SECRECY]),
    ("We guarantee returns of 40% a month.", [TOO_GOOD]),
    # "Tuma ada" is "send the fee": a fee and a request to send money. At most three reasons are shown.
    ("Tuma ada ya usajili kwa M-Pesa [phone removed] haraka.", [FEE, ASKS_MONEY, PAYMENT_DETAILS]),
    ("Lipa ada ya maombi leo tu.", [FEE, ASKS_MONEY, PRESSURE]),
    ("Tuma doo ya processing fee", [FEE, ASKS_MONEY]),
])
def test_flags_money_requests_with_reasons(text, reasons):
    assert check_message(text) == {"flagged": True, "reasons": reasons}


@pytest.mark.parametrize("text", [
    "Our chama Paybill is 522522, account number is the member name.",
    "My service fee for the shareholders agreement is KSh 25,000, payable on invoice.",
    "The grant is paid straight to your company's bank account.",
    "Wait till Friday, I will confirm the terms.",
    "Please send me your pitch deck.",
    "Urgent: can we move the meeting to 3pm?",
    "",
    "   ",
])
def test_ordinary_messages_are_not_flagged(text):
    assert check_message(text) == {"flagged": False, "reasons": []}


def test_pressure_alone_is_not_a_money_request():
    assert check_message("Reply now, the deadline is today only")["flagged"] is False


def test_at_most_three_reasons_without_duplicates():
    text = ("Pay the processing fee now, send money to Till 123456, guaranteed returns, "
            "don't tell anyone, today only")
    reasons = check_message(text)["reasons"]
    assert len(reasons) == 3 and len(set(reasons)) == 3


def test_every_labelled_example():
    rows = [json.loads(line) for line in DATASET.read_text(encoding="utf-8").splitlines() if line.strip()]
    wrong = [r["text"] for r in rows if check_message(r["text"])["flagged"] != r["scam"]]
    assert wrong == []


def test_fast_enough_for_every_message():
    text = "Habari, " * 250 + "tuma pesa kwa till 123456"
    started = time.perf_counter()
    for _ in range(50):
        check_message(text)
    assert (time.perf_counter() - started) / 50 < 0.2


def test_endpoint(client):
    res = client.post("/moderation/check-message", json={"text": "Send the clearance fee today only"}, headers=KEY)
    assert res.status_code == 200
    assert res.json() == {"flagged": True, "reasons": [FEE, PRESSURE]}


def test_endpoint_requires_the_key(client):
    assert client.post("/moderation/check-message", json={"text": "hi"}).status_code == 401
