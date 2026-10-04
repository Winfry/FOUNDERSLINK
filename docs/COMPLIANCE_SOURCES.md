# FoundersLink — Official Sources for Ask Compliance

**For:** AI/ML 2 and whoever helps collect sources.
**Why:** Ask Compliance answers only from official documents we have stored (TEAM_DECISIONS D3). As of 4 October `data/compliance/sources.json` lists 27 sources. Ask Compliance still cannot give a cited answer: 20 of the 27 files are not in the repo and must be fetched, the index must be built, and an LLM key is needed (`docs/FINAL_VERIFICATION.md` section 6). Until then every question gets "No official source for this yet". This page lists exactly which documents to collect, where, and which checklist item each one answers.

Scope since D11: **startups only**, so no SME, grant, SACCO or government-fund sources are needed.

---

## Rules for every source

1. **Official only:** Kenya Law (the national law reports), KRA, the Business Registration Service (BRS) and eCitizen, the ODPC, NSSF, the Social Health Authority, the Capital Markets Authority, and county government websites. No blogs, news articles, law-firm summaries or AI-written pages.
2. **The newest version.** Tax and levy rules change with every Finance Act: record which one a source reflects (`finance_act_year`).
3. **Record where it came from:** the exact page or PDF link (`url`) and the day you checked it (`last_verified_at`). Her ingest refuses any source without both.
4. **Download once,** save it under `data/compliance/`, and point `file` at it. Never fetch while answering a question.

> **Getting the files:** the root `.gitignore` ignores `*.pdf`, so each machine downloads them: `python -m scripts.fetch_compliance_sources` fetches every source in `sources.json`, then `python -m ai.compliance_rag.ingest` builds the index. Priority 1 is in `sources.json` as of 4 October. `python -m scripts.make_source_pack` writes the summary PDF to `docs/Kenya_Founder_Compliance_Source_Pack.pdf`.

---

## The documents, by checklist item

Item ids are the backend's (`backend/data/demo-compliance-items.json`). **Priority 1** is the minimum for the demo: about ten documents.

### Registering the business

| Priority | Document | Issuer | Where to find it | Answers items |
|---|---|---|---|---|
| 1 | **Companies Act, 2015** | Parliament | Kenya Law | `brs_registration`, `deal_cofounder_company_registration`, `deal_cofounder_directors_update`, `deal_investment_share_allotment` |
| 1 | **Guide to registering a company and a business name** | Business Registration Service | brs.go.ke and the BRS pages on eCitizen | `brs_registration`, `deal_cofounder_company_registration` |
| 2 | **Registration of Business Names Act (Cap. 499)** | Parliament | Kenya Law | `brs_registration` (business names) |
| 1 | **Companies (Beneficial Ownership Information) Regulations, 2020** | Attorney General / BRS | Kenya Law, and BRS's guidance on beneficial ownership | `deal_cofounder_beneficial_ownership`, `deal_investment_beneficial_ownership` |
| 2 | **BRS guidance on changing directors and shareholders, and annual returns** | Business Registration Service | brs.go.ke / eCitizen | `deal_cofounder_directors_update`, `deal_investment_share_allotment` |

### Tax

| Priority | Document | Issuer | Where to find it | Answers items |
|---|---|---|---|---|
| 1 | **How to register for a KRA PIN** (non-individual / company) | KRA | kra.go.ke | `kra_pin` |
| 1 | **eTIMS guide and FAQs**, and the electronic tax invoice regulations | KRA | kra.go.ke (eTIMS section) | `etims` |
| 1 | **Tax Compliance Certificate: how to apply** | KRA | kra.go.ke | `tax_compliance_certificate` |
| 2 | **Tax Procedures Act, 2015** | Parliament | Kenya Law | `kra_pin`, `tax_compliance_certificate` |
| 2 | **The latest Finance Act** | Parliament | Kenya Law | Every tax and levy item (record the year) |
| 3 | **Stamp Duty Act (Cap. 480)** | Parliament | Kenya Law | `deal_investment_tax_stamp_duty` |

### Employing people

| Priority | Document | Issuer | Where to find it | Answers items |
|---|---|---|---|---|
| 1 | **Employer registration and contributions** (NSSF Act, 2013 and NSSF's employer guide) | NSSF | Kenya Law; nssf.or.ke | `employer_registrations` |
| 1 | **Social Health Insurance Act, 2023** and the SHA employer guide | Social Health Authority | Kenya Law; sha.go.ke | `employer_registrations` |
| 2 | **Affordable Housing Act, 2024** (the Housing Levy) and the collector's guidance | Parliament; KRA | Kenya Law; kra.go.ke | `employer_registrations` |
| 3 | **Employment Act, 2007** | Parliament | Kenya Law | `employer_registrations` (contracts, background) |

### Data protection

| Priority | Document | Issuer | Where to find it | Answers items |
|---|---|---|---|---|
| 1 | **Data Protection Act, 2019** | Parliament | Kenya Law; odpc.go.ke | `odpc_registration` |
| 1 | **Data Protection (Registration of Data Controllers and Data Processors) Regulations, 2021** and the ODPC's registration guidance | ODPC | odpc.go.ke; Kenya Law | `odpc_registration` |

### County business permits

One source per demo county (`jurisdiction_level: "county"`, with `county` set). Any other county is answered "not covered yet", never guessed from Nairobi.

| Priority | Document | Issuer | Where to find it | Answers items |
|---|---|---|---|---|
| 1 | **Nairobi business permit** page and the current county finance act | Nairobi City County | The county's official `.go.ke` website | `county_business_permit` |
| 2 | Mombasa, Kisumu and Machakos permit pages and finance acts | Each county | Each county's official `.go.ke` website | `county_business_permit` |

### Raising investment

| Priority | Document | Issuer | Where to find it | Answers items |
|---|---|---|---|---|
| 2 | **Capital Markets (Investment-Based Crowdfunding) Regulations, 2022**, and CMA guidance on when raising money from the public is regulated | Capital Markets Authority | cma.or.ke; Kenya Law | `deal_investment_agreement`, `deal_investment_investor_checks` (and the limits of what FoundersLink may do) |

### Items with no official source

These are good practice, not legal requirements: `deal_investment_term_sheet`, `deal_cofounder_agreement`, `deal_cofounder_equity_vesting`, `deal_expert_engagement_letter`, `deal_expert_confidentiality`, `business_bank_account`. Ask Compliance should say so and **suggest a verified expert** rather than cite anything. Don't go looking for blog posts to fill the gap.

### Sector licences (only if the demo needs one)

For the health-tech demo founder: the **Health Act, 2017** (Kenya Law) and the **Kenya Medical Practitioners and Dentists Council**'s guidance on registering health facilities and telehealth. For a fintech: the **Central Bank of Kenya**'s rules for payment services or digital credit providers. Add these only after priority 1 is done.

---

## How to record a source

One entry per document in `data/compliance/sources.json`, in the format her ingest reads (`ai/compliance_rag/ingest.py`):

```json
{
  "sources": [
    {
      "id": "kra_pin_registration_guide",
      "title": "How to register for a KRA PIN",
      "institution": "Kenya Revenue Authority",
      "regulator": "KRA",
      "url": "https://<the exact page you downloaded>",
      "last_verified_at": "2026-10-04",
      "next_review_at": "2027-01-04",
      "jurisdiction_level": "national",
      "file": "national/kra_pin_registration_guide.pdf",
      "item_ids": ["kra_pin"],
      "language": "en",
      "owner": "AI/ML 2"
    }
  ]
}
```

For a county source, set `"jurisdiction_level": "county"` and `"county": "Nairobi"`. For a tax or levy source, add `"finance_act_year"`.

## Done when

- [ ] Every **priority 1** document is downloaded, recorded and ingested (about ten)
- [ ] Every checklist item above has at least one source, or is listed under "no official source"
- [ ] Ask Compliance answers "Do I need a KRA PIN?" and "Do I need to register with the ODPC?" with a citation and date
- [ ] A question about a county we don't cover answers "not covered yet"
