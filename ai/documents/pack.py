# Compiles the due-diligence pack for a deal (TEAM_DECISIONS D12): for
# each party, what FounderLink has confirmed, what is only uploaded or
# self-reported, and what is still missing, plus one summary. Built only
# from what the backend sends, so it never claims anything it can't show.

TEXT = {
    "profile": {"en": "Profile details (business, county, amount), from the profile",
                "sw": "Maelezo ya wasifu (biashara, kaunti, kiasi), kutoka kwenye wasifu"},
    "confirmed": {"en": "{title}: confirmed by FounderLink",
                  "sw": "{title}: imethibitishwa na FounderLink"},
    "waiting_clean": {"en": "{title}: uploaded, AI pre-check found no concerns, waiting for FounderLink to confirm",
                      "sw": "{title}: imepakiwa, ukaguzi wa AI haukupata tatizo, inasubiri uthibitisho wa FounderLink"},
    "waiting_flagged": {"en": "{title}: uploaded, AI pre-check flagged: {concern}",
                        "sw": "{title}: imepakiwa, ukaguzi wa AI umeona: {concern}"},
    "waiting_unread": {"en": "{title}: uploaded, could not be read automatically, waiting for an admin",
                       "sw": "{title}: imepakiwa, haikuweza kusomwa, inasubiri msimamizi"},
    "waiting": {"en": "{title}: uploaded, waiting for FounderLink to confirm",
                "sw": "{title}: imepakiwa, inasubiri uthibitisho wa FounderLink"},
    "rejected": {"en": "{title}: not accepted, please share another",
                 "sw": "{title}: haikukubaliwa, tafadhali tuma nyingine"},
    "deal": {"en": "{deal_type} deal at {stage}.", "sw": "Mkataba wa {deal_type}, hatua ya {stage}."},
    "ready": {"en": "Every party has shared and FounderLink has confirmed the documents this deal asks for.",
              "sw": "Kila upande umetuma na FounderLink imethibitisha nyaraka zinazohitajika."},
    "missing": {"en": "{n} still missing before terms can be agreed.",
                "sw": "{n} bado zinakosekana kabla ya kukubaliana masharti."},
    "waiting_total": {"en": "{n} waiting for FounderLink to confirm.",
                      "sw": "{n} zinasubiri uthibitisho wa FounderLink."},
    "flags": {"en": "The AI flagged {n} for an admin to look at.",
              "sw": "AI imeonyesha {n} kwa msimamizi kuangalia."},
}

COUNT = {
    "document": {"en": ("1 document", "{n} documents"), "sw": ("Nyaraka 1", "Nyaraka {n}")},
    "concern": {"en": ("1 concern", "{n} concerns"), "sw": ("jambo 1", "mambo {n}")},
}

DEAL_TYPE = {
    "cofounder_partnership": {"en": "Co-founder partnership", "sw": "ushirikiano wa waanzilishi"},
    "investment": {"en": "Investment", "sw": "uwekezaji"},
    "expert_engagement": {"en": "Expert engagement", "sw": "huduma ya mtaalamu"},
    "joint_venture": {"en": "Joint venture", "sw": "ubia"},
}

STAGE = {
    "exploring": {"en": "exploring", "sw": "majadiliano"},
    "due_diligence": {"en": "due diligence", "sw": "uchunguzi wa kina"},
    "terms_agreed": {"en": "terms agreed", "sw": "masharti yamekubaliwa"},
    "documents_compliance": {"en": "documents and compliance", "sw": "nyaraka na uzingatiaji"},
    "closed": {"en": "closed", "sw": "umekamilika"},
    "active": {"en": "active", "sw": "unaendelea"},
}


def _t(key: str, lang: str, **params) -> str:
    return TEXT[key].get(lang, TEXT[key]["en"]).format(**params)


def _count(kind: str, n: int, lang: str) -> str:
    one, many = COUNT[kind].get(lang, COUNT[kind]["en"])
    return (one if n == 1 else many).format(n=n)


def _waiting_line(doc: dict, lang: str) -> tuple[str, int]:
    """The line for an uploaded, unconfirmed document, and how many concerns it carries."""
    precheck = doc.get("precheck")
    if not precheck:
        return _t("waiting", lang, title=doc["title"]), 0
    if not precheck.get("readable", True):
        return _t("waiting_unread", lang, title=doc["title"]), 1
    concerns = precheck.get("concerns") or []
    if concerns:
        return _t("waiting_flagged", lang, title=doc["title"], concern=concerns[0]), len(concerns)
    return _t("waiting_clean", lang, title=doc["title"]), 0


def build_pack(deal: dict, parties: list[dict], language: str = "en") -> dict:
    """One entry per party, in the order sent, and a summary. The backend
    shows nothing unless every party it sent comes back."""
    lang = language if language in ("en", "sw") else "en"
    packed, missing_total, waiting_total, flag_total = [], 0, 0, 0

    for party in parties:
        documents = party.get("documents") or []
        usable = [d for d in documents if d.get("status") != "rejected"]
        verified = list(party.get("checks") or [])
        verified += [_t("confirmed", lang, title=d["title"]) for d in usable if d.get("status") == "verified"]

        self_reported = [_t("profile", lang)]
        for doc in usable:
            if doc.get("status") != "verified":
                line, flags = _waiting_line(doc, lang)
                self_reported.append(line)
                waiting_total += 1
                flag_total += flags

        # A document that was not accepted is missing too, said once, with
        # the reason she needs to act on.
        rejected = {d["type"]: d for d in documents if d.get("status") == "rejected"
                    and not any(u["type"] == d["type"] for u in usable)}
        missing = []
        for required in party.get("required") or []:
            if any(d["type"] == required["type"] for d in usable):
                continue
            doc = rejected.pop(required["type"], None)
            missing.append(_t("rejected", lang, title=doc["title"]) if doc else required["title"])
        missing += [_t("rejected", lang, title=d["title"]) for d in rejected.values()]
        missing_total += len(missing)

        packed.append({"role": party["role"], "verified": verified, "self_reported": self_reported, "missing": missing})

    deal_type = DEAL_TYPE.get(deal.get("type"), {}).get(lang, str(deal.get("type", "")).replace("_", " "))
    stage = STAGE.get(deal.get("stage"), {}).get(lang, str(deal.get("stage", "")).replace("_", " "))
    sentences = [_t("deal", lang, deal_type=deal_type, stage=stage)]
    if missing_total == 0 and waiting_total == 0:
        sentences.append(_t("ready", lang))
    if missing_total:
        sentences.append(_t("missing", lang, n=_count("document", missing_total, lang)))
    if waiting_total:
        sentences.append(_t("waiting_total", lang, n=_count("document", waiting_total, lang)))
    if flag_total:
        sentences.append(_t("flags", lang, n=_count("concern", flag_total, lang)))

    return {"parties": packed, "summary": " ".join(sentences)}
