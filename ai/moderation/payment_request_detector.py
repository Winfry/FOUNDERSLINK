# The scam check on messages (TEAM_DECISIONS D2): does this message ask
# someone to pay? A flag adds a warning for the people receiving it. It
# never blocks the message, because real investors and chamas also talk
# about money.
#
# Rules, not a model: fast enough for every message (well under 200 ms),
# and every warning can be explained to a member or a judge.
#
# The backend replaces phone numbers and emails with "[phone removed]" and
# "[email removed]" before sending, so a placeholder means a number was given.

import re

from ai.extraction.sheng import normalise

MAX_REASONS = 3

# Reasons, in the order they are shown. Written for the person receiving
# the message: they describe it, they never accuse the sender.
FEE = "Mentions a fee to be paid"
ASKS_MONEY = "Asks for money to be sent"
PAYMENT_DETAILS = "Gives payment details to pay into"
TOO_GOOD = "Promises guaranteed returns or funding"
PRESSURE = "Pushes you to act quickly"
SECRECY = "Asks you to keep it secret"

# Fees scams invent to release money that doesn't exist. Ordinary fees an
# expert may quote ("my service fee", "legal fees") are left out on purpose:
# warning about them would teach people to ignore the warning.
FEE_WORDS = (
    r"processing|registration|facilitation|commitment|clearance|application|approval|"
    r"administration|admin|activation|release|transfer|verification|onboarding|joining|"
    r"membership|unlocking|disbursement"
)
FEE_PATTERN = re.compile(
    rf"\b(?:{FEE_WORDS})\s+fees?\b"
    r"|\bfees?\s+(?:of|for)\s+(?:processing|registration|approval|release|disbursement)\b"
    r"|\bada\s+ya\s+(?:usajili|kujiandikisha|maombi|uthibitisho|kuidhinisha|huduma|kutoa)\b"
    r"|\bmalipo\s+ya\s+(?:awali|usajili|kwanza)\b",
)

ASK_PATTERN = re.compile(
    r"\bsend\s+(?:me|us|it|him|her)?\s*(?:the|some|your|a)?\s*(?:money|cash|funds|payment|amount|fee)\b"
    r"|\btransfer\s+(?:the\s+|some\s+|your\s+)?(?:money|cash|funds|amount|fee)\b"
    r"|\bpay\s+(?:the|a|your|this|that)?\s*(?:fee|amount|deposit|money|charges?|balance)\b"
    r"|\b(?:make|pay)\s+(?:a\s+|the\s+)?deposit\b"
    r"|\btop[\s-]?up\b"
    r"|\btuma\s+(?:pesa|hela|kiasi|ada|malipo)\b"
    r"|\bnitumie\s+(?:pesa|hela|kiasi|ada)\b"
    r"|\b(?:lipa|lipia)\s+(?:ada|pesa|kiasi|malipo)\b"
    r"|\bweka\s+pesa\b",
)

# A number to pay into: an M-Pesa line, Paybill, Till or bank account.
PAY_CHANNEL = re.compile(
    r"\bm-?\s?pesa\b|\bpay\s?bill\b|\btill\b|\bbuy\s+goods\b|\bpochi(?:\s+la\s+biashara)?\b"
    r"|\baccount\s+(?:number|no\.?)|\bacc\.?\s+no\b|\bbank\s+account\b"
)
HAS_NUMBER = re.compile(r"\[phone removed\]|\b\d{5,}\b")
PAY_VERB = re.compile(r"\b(?:pay|send|deposit|transfer|tuma|lipa|lipia|weka|nitumie)\b")

TOO_GOOD_PATTERN = re.compile(
    r"\bguarantee(?:d|s)?\s+(?:returns?|profits?|income|funding|approval|loans?|payouts?|money)\b"
    r"|\b(?:returns?|profits?|funding|approval)\s+(?:is|are)\s+guaranteed\b"
    r"|\bdouble\s+your\s+(?:money|investment|capital|cash)\b"
    r"|\b100\s?%\s+(?:guaranteed|approval|returns?|profit|funding)\b"
    r"|\brisk[\s-]free\s+(?:returns?|investment|profits?)\b"
    r"|\bfaida\s+ya\s+uhakika\b|\bmara\s+mbili\s+ya\s+pesa\b|\bpesa\s+(?:yako\s+)?mara\s+mbili\b"
)

PRESSURE_PATTERN = re.compile(
    r"\btoday\s+only\b|\bwithin\s+\d+\s*(?:hours?|hrs?|minutes?|mins?)\b|\bbefore\s+(?:midnight|tonight|it\s+expires)\b"
    r"|\b(?:act|pay|send|reply)\s+(?:now|immediately|urgently|asap)\b|\burgent(?:ly)?\b"
    r"|\blimited\s+(?:slots?|spaces?|time|offer)\b|\blast\s+chance\b"
    r"|\bharaka\b|\bleo\s+tu\b|\bsasa\s+hivi\b"
)

SECRECY_PATTERN = re.compile(
    r"\b(?:don'?t|do\s+not)\s+tell\b|\bkeep\s+(?:this|it)\s+(?:between\s+us|private|secret|confidential)\b"
    r"|\busimwambie\b|\bsiri\s+yetu\b|\bkati\s+yetu\b"
)


def check_message(text: str) -> dict:
    """{ "flagged": bool, "reasons": [...] }: the shape the backend expects."""
    if not text or not text.strip():
        return {"flagged": False, "reasons": []}

    # Sheng first ("tuma doo" -> "tuma pesa"), then one form of M-Pesa.
    norm = normalise(text)
    norm = re.sub(r"\bm\s?-?\s?pesa\b", "mpesa", norm).replace("mpesa", "m-pesa")

    fee = bool(FEE_PATTERN.search(norm))
    asks = bool(ASK_PATTERN.search(norm))
    too_good = bool(TOO_GOOD_PATTERN.search(norm))
    details = bool(PAY_CHANNEL.search(norm) and HAS_NUMBER.search(norm))
    # Payment details on their own are normal (a chama's Paybill). With a
    # request to pay they are what a scam needs.
    details_with_request = details and (fee or asks or bool(PAY_VERB.search(norm)))

    flagged = fee or asks or too_good or details_with_request
    if not flagged:
        return {"flagged": False, "reasons": []}

    reasons = []
    if fee:
        reasons.append(FEE)
    if asks:
        reasons.append(ASKS_MONEY)
    if details_with_request:
        reasons.append(PAYMENT_DETAILS)
    if too_good:
        reasons.append(TOO_GOOD)
    # Pressure and secrecy are only worth saying about a money request.
    if PRESSURE_PATTERN.search(norm):
        reasons.append(PRESSURE)
    if SECRECY_PATTERN.search(norm):
        reasons.append(SECRECY)
    return {"flagged": True, "reasons": reasons[:MAX_REASONS]}
