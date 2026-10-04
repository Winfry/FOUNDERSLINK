# Every sentence a founder reads, in English and Swahili. Matching code
# never writes text directly: it asks for a message by key, so both
# languages always say the same thing.
#
# The Swahili was written for clarity, not style. Have a native speaker
# review it before the demo.

LANGUAGES = ("en", "sw")


def language_of(value: str | None) -> str:
    return value if value in LANGUAGES else "en"


LABELS = {
    "journey": {
        "en": {"startup": "startups", "sme": "small businesses"},
        "sw": {"startup": "kampuni changa", "sme": "biashara ndogo"},
    },
    "sector": {
        "en": {"agri": "agriculture", "fintech": "fintech", "climate": "climate"},
        "sw": {
            "health": "afya", "agri": "kilimo", "fintech": "teknolojia ya fedha",
            "climate": "mazingira", "retail": "rejareja", "education": "elimu",
            "logistics": "usafirishaji", "other": "sekta nyingine",
        },
    },
    "stage": {
        "en": {"idea": "idea", "mvp": "MVP", "early_revenue": "early revenue", "growth": "growth"},
        "sw": {"idea": "wazo", "mvp": "bidhaa ya majaribio", "early_revenue": "mapato ya mwanzo", "growth": "ukuaji"},
    },
    "instrument": {
        "en": {"convertible_note": "convertible notes", "loan": "loans", "grant": "grants"},
        "sw": {"equity": "hisa", "convertible_note": "noti za kubadilishwa kuwa hisa", "loan": "mikopo", "grant": "ruzuku"},
    },
}

LABELS["skill"] = {
    "en": {
        "software_engineering": "software engineering", "mobile_development": "mobile apps",
        "data_science_ml": "data science and machine learning", "product_design": "product design",
        "product_management": "product management", "sales": "sales", "marketing": "marketing",
        "finance": "finance", "operations": "operations", "legal": "legal", "hardware_engineering": "hardware",
        "fundraising": "fundraising",
    },
    "sw": {
        "software_engineering": "uhandisi wa programu", "mobile_development": "app za simu",
        "data_science_ml": "sayansi ya data na AI", "product_design": "ubunifu wa bidhaa",
        "product_management": "usimamizi wa bidhaa", "sales": "mauzo", "marketing": "masoko",
        "finance": "fedha", "operations": "uendeshaji", "legal": "sheria", "hardware_engineering": "vifaa",
        "fundraising": "kutafuta ufadhili",
    },
}
LABELS["commitment"] = {
    "en": {"full_time": "full-time", "part_time": "part-time"},
    "sw": {"full_time": "muda wote", "part_time": "muda wa sehemu"},
}
LABELS["profession"] = {
    "en": {"lawyer": "a lawyer", "accountant": "an accountant", "mentor": "a mentor", "other": "an expert"},
    "sw": {"lawyer": "wakili", "accountant": "mhasibu", "mentor": "mshauri", "other": "mtaalamu"},
}

AND = {"en": "and", "sw": "na"}


def label(kind: str, value: str, lang: str) -> str:
    return LABELS.get(kind, {}).get(lang, {}).get(value, value.replace("_", " "))


def labels(kind: str, values: list[str], lang: str) -> str:
    words = [label(kind, v, lang) for v in values]
    if len(words) <= 1:
        return "".join(words)
    return f"{', '.join(words[:-1])} {AND[lang]} {words[-1]}"


def kes(n: int) -> str:
    return f"KSh {n:,}"


MESSAGES = {
    # Structured checks
    "journey.fit": {"en": "Funds {mine}", "sw": "Wanafadhili {mine}"},
    "journey.miss": {"en": "Funds {theirs}, not {mine}", "sw": "Wanafadhili {theirs}, si {mine}"},
    "sector.any": {"en": "Open to all sectors", "sw": "Wako wazi kwa sekta zote"},
    "sector.fit": {"en": "Funds {sector} businesses", "sw": "Wanafadhili biashara za {sector}"},
    "sector.miss": {"en": "Focuses on {sectors}, not {sector}", "sw": "Wanalenga {sectors}, si {sector}"},
    "stage.any": {"en": "Open to any stage", "sw": "Wako wazi kwa hatua yoyote"},
    "stage.unknown": {
        "en": "You have not said your stage. They fund: {stages}",
        "sw": "Hujataja hatua uliyofikia. Wanafadhili: {stages}",
    },
    "stage.fit": {"en": "Funds businesses at the {stage} stage", "sw": "Wanafadhili biashara zilizo katika hatua ya {stage}"},
    "stage.miss": {
        "en": "Funds businesses at these stages: {stages}, not {stage}",
        "sw": "Wanafadhili biashara zilizo katika hatua hizi: {stages}, si {stage}",
    },
    "county.any": {"en": "Available nationwide", "sw": "Wanapatikana nchi nzima"},
    "county.fit": {"en": "Available in {county}", "sw": "Wanapatikana katika kaunti ya {county}"},
    "county.miss": {"en": "Only available in {counties}", "sw": "Wanapatikana tu katika {counties}"},
    "amount.unknown": {
        "en": "You have not said how much you need. They fund {low} to {high}",
        "sw": "Hujataja kiasi unachohitaji. Wanafadhili {low} hadi {high}",
    },
    "amount.low": {
        "en": "You need {need}; their minimum is {low}",
        "sw": "Unahitaji {need}; kiwango chao cha chini ni {low}",
    },
    "amount.high": {
        "en": "You need {need}; their maximum is {high}",
        "sw": "Unahitaji {need}; kiwango chao cha juu ni {high}",
    },
    "amount.fit": {
        "en": "Your {need} is within their range of {low} to {high}",
        "sw": "{need} unachohitaji kiko ndani ya kiwango chao cha {low} hadi {high}",
    },
    "instrument.fit": {"en": "Offers {shared}, which you are open to", "sw": "Wanatoa {shared}, ambazo uko tayari kupokea"},
    "instrument.miss": {"en": "Offers {theirs}; you asked for {mine}", "sw": "Wanatoa {theirs}; uliomba {mine}"},
    "mandate.fit": {
        "en": "What you described matches what they say they fund",
        "sw": "Ulichoeleza kinalingana na wanachosema wanafadhili",
    },
    # People matching: co-founders and experts
    "skills.fit": {"en": "Has the skills you need: {skills}", "sw": "Ana ujuzi unaohitaji: {skills}"},
    "skills.miss": {"en": "Doesn't list the skills you need ({skills})", "sw": "Hana ujuzi unaohitaji ({skills})"},
    "skills.unknown": {
        "en": "You haven't said which skills you need in a co-founder",
        "sw": "Hujataja ujuzi unaohitaji kwa mwanzilishi mwenzako",
    },
    "same_skills.miss": {"en": "Has the same skills as you, not new ones", "sw": "Ana ujuzi ule ule ulio nao"},
    "open.miss": {"en": "Not looking to co-found right now", "sw": "Hatafuti kuwa mwanzilishi mwenza kwa sasa"},
    "sector_interest.fit": {"en": "Also works in {sector}", "sw": "Pia anafanya kazi katika {sector}"},
    "sector_interest.miss": {"en": "Works in {theirs}, not {sector}", "sw": "Anafanya kazi katika {theirs}, si {sector}"},
    "location.fit": {"en": "Based in {county}, like you", "sw": "Yuko {county}, kama wewe"},
    "location.covers": {"en": "Works with founders in {county}", "sw": "Anafanya kazi na waanzilishi wa {county}"},
    "location.miss": {
        "en": "Based in {theirs}, not {county}: you would work remotely",
        "sw": "Yuko {theirs}, si {county}: mngefanya kazi kwa mbali",
    },
    "commitment.fit": {"en": "Can commit {commitment}", "sw": "Anaweza kujitolea {commitment}"},
    "commitment.miss": {"en": "Can only commit {commitment}", "sw": "Anaweza kujitolea {commitment} tu"},
    "profession.fit": {"en": "Profession: {profession}, the kind of expert you need", "sw": "Ni {profession}, unayemhitaji"},
    "profession.miss": {"en": "Profession: {theirs}, but you need: {profession}", "sw": "Ni {theirs}; unahitaji {profession}"},
    "services.fit": {"en": "Offers: {services}", "sw": "Anatoa: {services}"},
    "availability.fit": {"en": "Has {count} free {sessions} this month", "sw": "Ana nafasi {count} mwezi huu"},
    "availability.miss": {"en": "No free sessions left this month", "sw": "Hana nafasi iliyobaki mwezi huu"},
    "meaning.fit": {"en": "What you described matches their background", "sw": "Ulichoeleza kinalingana na uzoefu wake"},
    # Band summaries, the first reason on a profile page
    "band.strong": {"en": "A strong fit: everything we checked lines up.", "sw": "Inafaa sana: kila tulichokagua kinalingana."},
    "band.good": {"en": "A good fit, with one thing to check.", "sw": "Inafaa, ila kuna jambo moja la kuangalia."},
    "band.possible": {
        "en": "A possible fit: a few things are unclear or don't match.",
        "sw": "Huenda ikafaa: mambo machache hayako wazi au hayalingani.",
    },
    "band.not_a_fit": {"en": "Not a fit right now.", "sw": "Haifai kwa sasa."},
    # Reason framing
    "reason.why": {"en": "Why it fits: {items}.", "sw": "Kwa nini inafaa: {items}."},
    "reason.check": {"en": "Check: {item}.", "sw": "Angalia: {item}."},
    "reason.why_not": {"en": "Why not: {items}.", "sw": "Kwa nini haifai: {items}."},
    "action.amount": {
        "en": "Add how much you need to your profile to confirm the amount.",
        "sw": "Ongeza kiasi unachohitaji kwenye wasifu wako ili tuthibitishe kiasi.",
    },
    "action.stage": {
        "en": "Add your stage to your profile to confirm the stage.",
        "sw": "Ongeza hatua uliyofikia kwenye wasifu wako ili tuthibitishe hatua.",
    },
    # Track-record highlights
    "track.sector_stage": {
        "en": "{verb} {count} {sector} {businesses} at the {stage} stage, like yours",
        "sw": "{verb} {businesses} {count} {of} {sector} katika hatua ya {stage}, kama yako",
    },
    "track.sector": {
        "en": "{verb} {count} {sector} {businesses} before",
        "sw": "{verb} {businesses} {count} {of} {sector} hapo awali",
    },
    "track.stage": {
        "en": "{verb_stage} at the {stage} stage {count} {times}",
        "sw": "{verb_stage} katika hatua ya {stage} mara {count}",
    },
    "track.other_sectors": {
        "en": "No {sector} investments on record. Past investments are in {sectors}",
        "sw": "Hakuna uwekezaji wa {sector} kwenye rekodi. Uwekezaji wa awali ni katika {sectors}",
    },
    "track.verified_deals": {
        "en": "Has closed {count} {deals} on FounderLink",
        "sw": "Wamekamilisha {deals} {count} kwenye FounderLink",
    },
    "verb.has": {"en": "Has backed", "sw": "Wamefadhili"},
    "verb.says": {"en": "Says they have backed", "sw": "Wanasema wamefadhili"},
    "verb_stage.has": {"en": "Has invested", "sw": "Wamewekeza"},
    "verb_stage.says": {"en": "Says they have invested", "sw": "Wanasema wamewekeza"},
    # Evidence, shown after a highlight
    "source.platform_deal": {"en": "{count} verified on FounderLink", "sw": "{count} zimethibitishwa kwenye FounderLink"},
    "source.public": {"en": "{count} from a public source", "sw": "{count} kutoka chanzo cha umma"},
    "source.self_reported": {"en": "{count} self-reported", "sw": "{count} wamejitangazia wenyewe"},
    "source.only_self_reported": {"en": "self-reported, not confirmed", "sw": "wamejitangazia wenyewe, haijathibitishwa"},
}

# Words that change with the count.
PLURALS = {
    "businesses": {"en": ("business", "businesses"), "sw": ("biashara", "biashara")},
    "of": {"en": ("", ""), "sw": ("ya", "za")},
    "times": {"en": ("time", "times"), "sw": ("", "")},
    "deals": {"en": ("deal", "deals"), "sw": ("mkataba", "mikataba")},
    "sessions": {"en": ("session", "sessions"), "sw": ("", "")},
}


def plural(word: str, count: int, lang: str) -> str:
    one, many = PLURALS[word][lang]
    return one if count == 1 else many


def t(key: str, lang: str, **params) -> str:
    template = MESSAGES[key].get(lang) or MESSAGES[key]["en"]
    return template.format(**params)
