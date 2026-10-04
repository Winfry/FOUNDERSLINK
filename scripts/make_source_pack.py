# Builds the Kenya Founder Compliance Source Pack: the ten documents behind
# Ask Compliance, their official links, what each one answers, and which
# parts to ingest. Reads data/compliance/sources.json, so the pack never
# lists a link the index doesn't have.
# Run from the repository root:  python -m scripts.make_source_pack

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
                                Spacer, Table, TableStyle)

DATA = Path("data/compliance")
OUT = Path("docs/Kenya_Founder_Compliance_Source_Pack.pdf")

# What each of the ten documents is for and which parts matter. Section
# numbers were read from the downloaded copies on 4 October 2026.
PACK = {
    1: {
        "name": "Companies Act, 2015",
        "use": "What forming a company requires, the registers a company must keep, directors' "
               "duties and changes, allotting shares to an investor, and annual returns.",
        "ingest": [
            "s.11-17: forming a company and the registration documents, including s.16A, the statement of beneficial owners",
            "s.93 and s.93A: register of members and register of beneficial owners",
            "s.128-138: directors, the register of directors, notifying the Registrar of changes",
            "s.327-336: power to allot shares, registration and return of allotment",
            "s.705-708: annual returns",
        ],
        "skip": "Public and quoted companies, takeovers, audit, insolvency. Indexing the whole Act works, "
                "but these parts crowd out the sections above in search results.",
    },
    2: {
        "name": "BRS company and business-name registration guides",
        "use": "The practical steps on BRS V2 (eCitizen): registering a business name or a company, "
               "fees, and updating directors and shareholders.",
        "ingest": [
            "BRS FAQs: whole document (how to register a business name and a company)",
            "Step-by-step guide on changes (V2): whole document",
            "Registration of Business Names Act (Cap. 499): whole Act, it is short",
        ],
        "skip": "Insolvency, liquidation and movable-property guides on the same BRS page.",
    },
    3: {
        "name": "Companies (Beneficial Ownership Information) Regulations, 2020",
        "use": "Who counts as a beneficial owner, what the company must find out and keep, and what it "
               "must lodge with the Registrar. Needed when a co-founder or investor takes shares.",
        "ingest": [
            "Regulations 2-4A: definitions, particulars, the company's duty to investigate, nominees",
            "Regulations 11-13: identification, offences, disclosure by the company",
            "BRS guide on disclosure of beneficial ownership: whole document",
            "BRS step-by-step guide to updating BOF on BRS V2: mostly screenshots, so only 3 of 12 pages are searchable",
        ],
        "skip": "Regulations 5-10 (warning notices and restrictions): rarely what a founder asks.",
    },
    4: {
        "name": "KRA PIN registration, non-individual",
        "use": "Who must register for a PIN and how a company registers on iTax.",
        "ingest": [
            "KRA page: how to register for a KRA PIN (non-individual), whole page",
            "KRA page: PIN registration for companies and partnerships, whole page",
        ],
        "skip": "KRA's site menu: the ingest now drops it automatically.",
    },
    5: {
        "name": "KRA eTIMS guides and FAQs",
        "use": "That every person in business must issue electronic tax invoices (section 23A of the Tax "
               "Procedures Act, added by the Finance Act 2023) and how to onboard.",
        "ingest": [
            "Guidelines to taxpayers on eTIMS onboarding (2024): whole document",
            "Procedure for eTIMS registration: whole document",
            "KRA eTIMS page: short overview, links to the rest",
        ],
        "skip": "Paypoint, Windows and Android installation manuals: about software, not obligations.",
    },
    6: {
        "name": "KRA Tax Compliance Certificate",
        "use": "What a TCC is, when it is asked for (for example government tenders and licences), how long it lasts, and that "
               "eTIMS compliance is now a condition (public notice of 24 October 2025).",
        "ingest": [
            "KRA TCC page: whole page",
            "Public notice on TCC enhancements: whole page",
            "Finance Act, 2026: whole Act, tagged finance_act_year 2026. Any answer about rates must cite it with its year",
        ],
        "skip": "The Finance Act's first page is a noisy scan of the Gazette cover: harmless, but it will never be cited.",
    },
    7: {
        "name": "NSSF Act, 2013 and employer resources",
        "use": "That an employer must register itself and its staff, pay contributions monthly, and "
               "what happens if it doesn't.",
        "ingest": [
            "NSSF Act s.19: registration of employer and employee",
            "s.20 and s.27: mandatory contributions, penalty for late or wrong payment",
            "s.55: offences relating to contributions",
            "NSSF employers page: documents to attach, contributions due by the 9th of the next month",
            "NSSF employer self-service guide: whole document",
        ],
        "skip": "Fund governance, investment and benefits sections.",
    },
    8: {
        "name": "Social Health Insurance Act, 2023 and SHA employer obligations",
        "use": "Registering with the Social Health Authority, deducting and remitting SHIF contributions "
               "for employees, and penalties.",
        "ingest": [
            "Social Health Insurance Act s.26 (registration), s.27 (contributions), s.48 (offences and penalties)",
            "Social Health Insurance Regulations, 2024: reg. 11 (initial registration), 22 (obligations of an employer), 23 (penalty)",
        ],
        "skip": "Facility empanelment, claims and benefit packages. We found no employer guide on "
                "sha.go.ke (the employer portal needs a login), so the Regulations are the employer source.",
    },
    9: {
        "name": "Data Protection Act, 2019 and ODPC regulations",
        "use": "Whether a startup must register with the ODPC as a data controller or processor, the "
               "small-business exemption, and when a data protection impact assessment is needed.",
        "ingest": [
            "Data Protection Act s.18-21: registration, application, duration, register",
            "s.31: data protection impact assessment; s.51 and s.54: exemptions",
            "Registration Regulations, 2021: reg. 4-13, including reg. 13 (exemption from mandatory registration)",
            "ODPC guidance note on registration: whole document",
            "ODPC guidance note on processing by MSMEs: whole document",
        ],
        "skip": "Data Commissioner's office and enforcement procedure sections.",
    },
    10: {
        "name": "Nairobi business permit and county Finance Act",
        "use": "Nairobi's Unified Business Permit, what it combines, and the fees and conditions set by "
               "county law. Every other county is answered 'not covered yet'.",
        "ingest": [
            "Nairobi City County Finance Act, 2023, Part V (s.26-28, from page 84): amendments to the Trade Licensing Act and its schedule of charges",
            "Nairobi City County Trade Licensing Act, 2019: scanned Gazette copy with no text layer, so it needs OCR before it can be searched",
            "Nairobi County page on the Unified Business Permit: whole page",
        ],
        "skip": "Parking, cess, building and market fees in the Finance Act.",
    },
}

# What a founder sees, item by item, and which pack documents back it.
CHECKLIST = [
    ("brs_registration", "Business registered with BRS", [1, 2]),
    ("kra_pin", "KRA PIN for the business", [4]),
    ("etims", "eTIMS invoicing", [5]),
    ("tax_compliance_certificate", "Tax compliance certificate", [6]),
    ("employer_registrations", "NSSF and SHA (once you employ someone)", [7, 8]),
    ("odpc_registration", "ODPC registration (if you handle personal data)", [9]),
    ("county_business_permit", "County business permit (Nairobi only, for now)", [10]),
    ("deal_*_beneficial_ownership", "Beneficial ownership filed (when shares change hands)", [1, 3]),
]

GAPS = [
    "<b>Housing Levy.</b> The checklist item employer_registrations names it, but the Affordable "
    "Housing Act, 2024 is not in the pack yet. Add it from Kenya Law with KRA's guidance before "
    "Ask Compliance answers Housing Levy questions.",
    "<b>Mombasa, Kisumu and Machakos</b> have no permit source, so they are answered 'not covered yet'.",
    "<b>The Trade Licensing Act, 2019</b> and 9 of 12 pages of the BRS step-by-step guide to updating "
    "beneficial ownership (BOF) need OCR (Tesseract) before their text can be searched.",
    "<b>last_verified_at</b> is the day these files were downloaded from the official site (4 October 2026). "
    "Before the demo, a team member should open each link, confirm it is still the current version, "
    "and re-date it.",
]


def styles():
    base = getSampleStyleSheet()
    s = {
        "title": ParagraphStyle("t", parent=base["Title"], fontSize=20, leading=24, alignment=TA_LEFT,
                                textColor=colors.HexColor("#0b3d2e"), spaceAfter=4),
        "sub": ParagraphStyle("s", parent=base["Normal"], fontSize=10, textColor=colors.HexColor("#555555"),
                              spaceAfter=10),
        "h1": ParagraphStyle("h1", parent=base["Heading2"], fontSize=13, leading=16, spaceBefore=10,
                             spaceAfter=4, textColor=colors.HexColor("#0b3d2e")),
        "h2": ParagraphStyle("h2", parent=base["Heading3"], fontSize=10.5, leading=13, spaceBefore=6, spaceAfter=2),
        "body": ParagraphStyle("b", parent=base["Normal"], fontSize=9, leading=12),
        "small": ParagraphStyle("sm", parent=base["Normal"], fontSize=8, leading=10),
        "link": ParagraphStyle("l", parent=base["Normal"], fontSize=7.5, leading=9.5,
                               textColor=colors.HexColor("#1a5fb4")),
        "code": ParagraphStyle("c", parent=base["Code"], fontSize=8, leading=10, backColor=colors.HexColor("#f3f3f3"),
                               borderPadding=4, spaceBefore=2, spaceAfter=6),
    }
    return s


def table(rows, widths, header=True):
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6f0ec")))
    t.setStyle(TableStyle(style))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawString(18 * mm, 10 * mm, "FounderLink - Kenya Founder Compliance Source Pack - official sources only, "
                                        "not legal advice")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build():
    s = styles()
    sources = json.loads((DATA / "sources.json").read_text(encoding="utf-8"))["sources"]
    by_pack: dict[int, list[dict]] = {}
    for src in sources:
        by_pack.setdefault(src.get("pack", 0), []).append(src)
    width = A4[0] - 36 * mm
    P = lambda text, st="body": Paragraph(text, s[st])  # noqa: E731

    story = [
        P("Kenya Founder Compliance Source Pack", "title"),
        P(f"FounderLink, Ask Compliance knowledge base. {len(sources)} official sources for 10 documents, "
          "downloaded 4 October 2026.", "sub"),
        P("Ask Compliance answers only from these documents and cites the one it used, with the date "
          "someone last checked it. If none of them covers a question, it says so and suggests an expert. "
          "This pack lists each document, where it comes from, what it answers, and which parts matter "
          "for the index."),
        Spacer(1, 6),
        P("The ten documents", "h1"),
    ]

    rows = [[P("<b>#</b>", "small"), P("<b>Document</b>", "small"), P("<b>Issuer</b>", "small"),
             P("<b>Answers checklist item</b>", "small"), P("<b>Files</b>", "small")]]
    for n in range(1, 11):
        srcs = by_pack.get(n, [])
        items = sorted({i for src in srcs for i in src["item_ids"]})
        issuers = sorted({src["regulator"] if src["regulator"] != "COUNTY" else "Nairobi County" for src in srcs})
        rows.append([P(str(n), "small"), P(PACK[n]["name"], "small"), P(", ".join(issuers), "small"),
                     P(", ".join(items), "small"), P(str(len(srcs)), "small")])
    story.append(table(rows, [8 * mm, 58 * mm, 24 * mm, 70 * mm, 14 * mm]))

    story += [
        P("What the founder sees", "h1"),
        P("A founder writes: <i>\"I've just registered my company and hired my first employee. What do I "
          "need to do?\"</i> Her profile says she has employees and is in Nairobi, so the checklist shows "
          "the items below. Each one has a <b>Why am I seeing this?</b> note taken from her own answers, "
          "and links to the source it came from."),
        Spacer(1, 4),
    ]
    rows = [[P("<b>Checklist item</b>", "small"), P("<b>Item id</b>", "small"), P("<b>Cites (pack #)</b>", "small")]]
    for item_id, label, packs in CHECKLIST:
        rows.append([P(label, "small"), P(item_id, "small"),
                     P(", ".join(f"{n}. {PACK[n]['name']}" for n in packs), "small")])
    story.append(table(rows, [62 * mm, 48 * mm, 64 * mm]))

    story += [
        P("How the team uses this pack", "h1"),
        P("1. Download every source (PDFs are git-ignored, so run this on each machine):"),
        P("python -m scripts.fetch_compliance_sources", "code"),
        P("2. Build the search index, then restart the AI service:"),
        P("python -m ai.compliance_rag.ingest", "code"),
        P("3. Add a source by adding an entry to <b>data/compliance/sources.json</b> with its official url, "
          "file and checklist item ids, then repeat steps 1 and 2. The ingest refuses any entry without a "
          "url or a last_verified_at date. Each chunk keeps its source, section and page, so every "
          "answer can cite them."),
        P("Known gaps", "h1"),
    ]
    story += [P(f"&bull; {g}") for g in GAPS]
    story.append(PageBreak())

    story.append(P("The documents in detail", "title"))
    for n in range(1, 11):
        meta = PACK[n]
        block = [P(f"{n}. {meta['name']}", "h1"), P(f"<b>Used for:</b> {meta['use']}")]
        rows = [[P("<b>Source</b>", "small"), P("<b>Official link</b>", "small"), P("<b>Saved as</b>", "small")]]
        for src in by_pack.get(n, []):
            rows.append([P(f"{src['title']}<br/><font color='#777777'>{src['institution']}</font>", "small"),
                         P(f"<link href='{src['url']}'>{src['url']}</link>", "link"),
                         P(src["file"], "small")])
        block += [Spacer(1, 3), table(rows, [62 * mm, 72 * mm, 40 * mm]), P("Ingest these parts", "h2")]
        block += [P(f"&bull; {part}") for part in meta["ingest"]]
        block += [P(f"<b>Leave out or deprioritise:</b> {meta['skip']}")]
        story.append(KeepTogether(block[:4]))
        story += block[4:]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title="Kenya Founder Compliance Source Pack", author="FounderLink")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    build()
