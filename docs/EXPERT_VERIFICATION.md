# Expert verification (Kenya)

Who can be an expert on FoundersLink, and how a person at FoundersLink checks
each one before they are shown to members. The list itself lives in
`shared/professions/index.ts`: the apps, the backend and the staff dashboard
all read it, so a profession or regulator is changed there, not in code
spread across the apps.

## What we promise

- **Every expert is checked by a person, against an independent source,
  before they are shown.** A certificate or a LinkedIn profile is never
  enough on its own.
- **We say what was checked, in words.** "Licensed · LSK", "Certified",
  "Experience checked". Never one green tick for everyone.
- **We do not promise "scam-free".** Checking lowers the risk; it cannot
  remove it. Members can report an expert at any time.
- **Legal, tax and audit work only from those licensed to do it.** A mentor
  or consultant cannot list those practice areas (the backend refuses it).

## The three trust levels

| Level | Meaning | Checks needed before approval |
|---|---|---|
| **Licensed** | On an official register, checked there | Identity, professional register |
| **Certified** | A qualification, checked with whoever awarded it | Identity, qualification |
| **Experience checked** | Work history and references, checked by a person | Identity, references |

A check that was never recorded is never a pass. Identity always goes
through the regulated identity provider, which returns pass or fail:
FoundersLink never asks for or stores ID numbers or ID documents (D10).

## The professions

| Category | Profession | Level | Checked against | Practice areas it may offer |
|---|---|---|---|---|
| Legal and governance | Advocate | Licensed | LSK | Land and property, company, contracts, investment deals, employment, trademarks, data protection, governance |
| Legal and governance | Company secretary | Licensed | ICS | Governance, company |
| Finance, tax and investment | Accountant or auditor | Licensed | ICPAK | Tax, bookkeeping, audit, valuation |
| Finance, tax and investment | Tax agent | Licensed | KRA | Tax |
| Finance, tax and investment | Investment adviser | Licensed | CMA | Valuation, fundraising |
| Land, property and building | Valuer | Licensed | Valuers Registration Board | Valuation |
| Land, property and building | Land surveyor | Licensed | Land Surveyors Board | Land surveys |
| Land, property and building | Architect | Licensed | BORAQS | Building and construction |
| Land, property and building | Quantity surveyor | Licensed | BORAQS | Building and construction |
| Land, property and building | Engineer | Licensed | EBK | Building and construction |
| Risk and insurance | Insurance broker | Licensed | IRA | Insurance |
| People and HR | HR professional | Licensed | IHRM | Hiring and HR |
| Technology and data | Data protection consultant | Certified | Awarding body | Data protection |
| Technology and data | IT and cybersecurity specialist | Certified | Awarding body | Technology |
| Strategy and growth | Mentor | Experience | References | Fundraising, growing the business |
| Strategy and growth | Business consultant | Experience | References | Growing the business, fundraising |
| Strategy and growth | Sector specialist | Experience | References | Sector knowledge, growing the business |

## The regulators

| Short | Regulator | How a person at FoundersLink checks |
|---|---|---|
| LSK | Law Society of Kenya | Search the advocate by name and admission number; confirm a practising certificate for this year. |
| ICPAK | Institute of Certified Public Accountants of Kenya | Search the member number; confirm a practising certificate for this year. |
| KRA | Kenya Revenue Authority | Confirm the tax agent licence number and its expiry. |
| ICS | Institute of Certified Secretaries | Search the member; confirm a practising certificate for this year. |
| VRB | Valuers Registration Board | Confirm registration and practising status using the Board's official contacts. |
| — | Land Surveyors Board | Confirm the licence using the Board's official contacts. |
| BORAQS | Board of Registration of Architects and Quantity Surveyors | Find the name in the public register; confirm it is active. |
| EBK | Engineers Board of Kenya | Find the engineer; confirm registration and practising licence. |
| CMA | Capital Markets Authority | Confirm the person or firm is a licensed investment adviser. |
| IRA | Insurance Regulatory Authority | Confirm the broker is a licensed insurance intermediary. |
| IHRM | Institute of Human Resource Management | Confirm membership and a practising certificate for this year. |

**Rules for staff**

- Where a regulator has no online register, contact it using its official
  contacts, found independently. Never use a phone number or email the
  applicant gave.
- A firm is checked separately from the person: the business on the BRS
  register ("Organisation" check), and, where the law requires it, the firm
  with its regulator.
- Every check records how it was made and by whom. The audit log keeps every
  decision and its reason.

## Expiry and re-checks

- Licensed and certified experts give the date their licence or certificate
  runs out. From that date they are not shown to members until a person
  checks them again.
- Everyone approved is looked at again within a year, or on the licence's
  expiry if that comes first.
- A change of profession or licence number sends the expert back for a
  re-check.
- A report about an expert is investigated fairly: the expert can respond,
  and an allegation is not treated as a finding.

## Before launch

Each regulator's row in `shared/professions/index.ts` has `confirmed: false`
until someone has confirmed with the regulator:

1. the address of its public register (or that it has none), and
2. that FoundersLink may check members against it in this way.

This needs a person at FoundersLink (or the partner's legal team) to
contact each regulator. Until then the lists above are our best
understanding, not confirmed facts.

## Another country

A new country gets its own regulators and professions in the same file,
with its own `country` code. Nothing else in the apps changes.
