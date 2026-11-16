// Who can be an expert on FoundersLink, and how each is checked.
//
// Data, not code: a profession, its regulator and what is asked are rows
// here, so a new one is added without touching the apps. Country-aware from
// the start: today only Kenya ("KE"); another country gets its own rows.
//
// Three trust levels, said in words on a profile, never one tick for all:
//   licensed     on an official register, checked there (LSK, ICPAK...)
//   certified    a qualification, checked with whoever awarded it
//   experience   work history and two references, checked by a person
//
// Before launch, each register's address and what the regulator allows us
// to check must be confirmed (docs/EXPERT_VERIFICATION.md). `confirmed`
// says whether that has been done.

export type Trust = 'licensed' | 'certified' | 'experience';
export type CheckType = 'identity' | 'professional_register' | 'qualification' | 'reference' | 'organisation';

export const TRUST: Record<Trust, { label: string; labelSw: string; line: string }> = {
  licensed: { label: 'Licensed', labelSw: 'Mwenye leseni', line: 'On the official register, checked there by FoundersLink.' },
  certified: { label: 'Certified', labelSw: 'Mwenye cheti', line: 'Qualification checked with the body that awarded it.' },
  experience: { label: 'Experience checked', labelSw: 'Uzoefu umeangaliwa', line: 'Work history and two references checked by a person.' },
};

export interface Regulator {
  id: string;
  country: 'KE';
  short: string;
  name: string;
  /** Where staff look the person up. Null: ask the regulator directly, using its official contacts. */
  registerUrl: string | null;
  /** How a person at FoundersLink checks someone here. */
  howToCheck: string;
  /** Whether the address and what may be checked have been confirmed with the regulator. */
  confirmed: boolean;
}

export const REGULATORS: Record<string, Regulator> = {
  lsk: { id: 'lsk', country: 'KE', short: 'LSK', name: 'Law Society of Kenya', registerUrl: 'https://lsk.or.ke', howToCheck: 'Search the advocate by name and admission number, and confirm a practising certificate for this year.', confirmed: false },
  icpak: { id: 'icpak', country: 'KE', short: 'ICPAK', name: 'Institute of Certified Public Accountants of Kenya', registerUrl: 'https://www.icpak.com', howToCheck: 'Search the member number, and confirm the member holds a practising certificate for this year.', confirmed: false },
  kra: { id: 'kra', country: 'KE', short: 'KRA', name: 'Kenya Revenue Authority (tax agents)', registerUrl: 'https://www.kra.go.ke', howToCheck: 'Confirm the tax agent licence number and its expiry with KRA.', confirmed: false },
  ics: { id: 'ics', country: 'KE', short: 'ICS', name: 'Institute of Certified Secretaries', registerUrl: 'https://www.ics.ke', howToCheck: 'Search the member, and confirm a practising certificate for this year.', confirmed: false },
  vrb: { id: 'vrb', country: 'KE', short: 'VRB', name: 'Valuers Registration Board', registerUrl: null, howToCheck: 'Confirm the registration and practising status with the Board, using its official contacts.', confirmed: false },
  lsb: { id: 'lsb', country: 'KE', short: 'Land Surveyors Board', name: 'Land Surveyors Board', registerUrl: null, howToCheck: 'Confirm the licence with the Board, using its official contacts.', confirmed: false },
  boraqs: { id: 'boraqs', country: 'KE', short: 'BORAQS', name: 'Board of Registration of Architects and Quantity Surveyors', registerUrl: 'https://www.boraqs.or.ke', howToCheck: 'Find the name in the public register of architects or quantity surveyors, and confirm it is active.', confirmed: false },
  ebk: { id: 'ebk', country: 'KE', short: 'EBK', name: 'Engineers Board of Kenya', registerUrl: 'https://ebk.go.ke', howToCheck: 'Find the engineer in the register, and confirm the registration and practising licence.', confirmed: false },
  cma: { id: 'cma', country: 'KE', short: 'CMA', name: 'Capital Markets Authority', registerUrl: 'https://www.cma.or.ke', howToCheck: 'Confirm the person or firm is on the list of licensed investment advisers.', confirmed: false },
  ira: { id: 'ira', country: 'KE', short: 'IRA', name: 'Insurance Regulatory Authority', registerUrl: 'https://www.ira.go.ke', howToCheck: 'Confirm the broker is on the list of licensed insurance intermediaries.', confirmed: false },
  ihrm: { id: 'ihrm', country: 'KE', short: 'IHRM', name: 'Institute of Human Resource Management', registerUrl: 'https://www.ihrm.or.ke', howToCheck: 'Confirm membership and a practising certificate for this year.', confirmed: false },
};

export const CATEGORIES = [
  { id: 'legal', label: 'Legal and governance' },
  { id: 'finance', label: 'Finance, tax and investment' },
  { id: 'property', label: 'Land, property and building' },
  { id: 'risk', label: 'Risk and insurance' },
  { id: 'people', label: 'People and HR' },
  { id: 'technology', label: 'Technology and data' },
  { id: 'growth', label: 'Strategy and growth' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];

export interface Profession {
  id: string;
  country: 'KE';
  label: string;
  /** "I am a ..." on the sign-up form. */
  line: string;
  category: CategoryId;
  trust: Trust;
  /** Licensed professions only: who keeps the register. */
  regulator?: string;
  /** Licensed: the number on the register. Certified: the qualification and who awarded it. */
  asks: { registerNumber?: boolean; expiry?: boolean; qualification?: boolean; references?: boolean };
  /** Practice areas this profession may offer. Legal, tax and audit work only for those licensed to do it. */
  areas: string[];
  /** Months between re-checks, besides on the licence's expiry. */
  recheckMonths: number;
}

const L = (p: Omit<Profession, 'country' | 'trust' | 'asks' | 'recheckMonths'> & { regulator: string }): Profession => ({
  ...p,
  country: 'KE',
  trust: 'licensed',
  asks: { registerNumber: true, expiry: true },
  recheckMonths: 12,
});
const C = (p: Omit<Profession, 'country' | 'trust' | 'asks' | 'recheckMonths'>): Profession => ({
  ...p,
  country: 'KE',
  trust: 'certified',
  asks: { qualification: true, expiry: true },
  recheckMonths: 24,
});
const E = (p: Omit<Profession, 'country' | 'trust' | 'asks' | 'recheckMonths'>): Profession => ({
  ...p,
  country: 'KE',
  trust: 'experience',
  asks: { references: true },
  recheckMonths: 24,
});

export const PROFESSIONS: Profession[] = [
  // Legal and governance
  L({ id: 'lawyer', label: 'Advocate', line: 'Agreements, company and land law, investment deals.', category: 'legal', regulator: 'lsk', areas: ['land_property', 'company', 'contracts', 'investment_deals', 'employment', 'intellectual_property', 'data_protection', 'governance'] }),
  L({ id: 'company_secretary', label: 'Company secretary', line: 'Share registers, annual returns, board governance.', category: 'legal', regulator: 'ics', areas: ['governance', 'company'] }),
  // Finance, tax and investment
  L({ id: 'accountant', label: 'Accountant or auditor', line: 'Books, tax, audits, checking the numbers.', category: 'finance', regulator: 'icpak', areas: ['tax', 'bookkeeping', 'audit', 'valuation'] }),
  L({ id: 'tax_agent', label: 'Tax agent', line: 'KRA filings, VAT, eTIMS, tax planning.', category: 'finance', regulator: 'kra', areas: ['tax'] }),
  L({ id: 'investment_adviser', label: 'Investment adviser', line: 'Valuing a business and structuring an investment.', category: 'finance', regulator: 'cma', areas: ['valuation', 'fundraising'] }),
  // Land, property and building
  L({ id: 'valuer', label: 'Valuer', line: 'What land, buildings and equipment are worth.', category: 'property', regulator: 'vrb', areas: ['valuation'] }),
  L({ id: 'land_surveyor', label: 'Land surveyor', line: 'Boundaries, beacons, subdivision and survey plans.', category: 'property', regulator: 'lsb', areas: ['land_survey'] }),
  L({ id: 'architect', label: 'Architect', line: 'Designs and approvals for buildings.', category: 'property', regulator: 'boraqs', areas: ['construction'] }),
  L({ id: 'quantity_surveyor', label: 'Quantity surveyor', line: 'What a building project should cost.', category: 'property', regulator: 'boraqs', areas: ['construction'] }),
  L({ id: 'engineer', label: 'Engineer', line: 'Technical checks on buildings, machines and infrastructure.', category: 'property', regulator: 'ebk', areas: ['construction'] }),
  // Risk and insurance
  L({ id: 'insurance_broker', label: 'Insurance broker', line: 'The right cover for a business, its assets and its people.', category: 'risk', regulator: 'ira', areas: ['insurance'] }),
  // People and HR
  L({ id: 'hr_consultant', label: 'HR professional', line: 'Hiring, contracts of employment, payroll policy.', category: 'people', regulator: 'ihrm', areas: ['hr'] }),
  // Technology and data
  C({ id: 'data_protection_consultant', label: 'Data protection consultant', line: 'ODPC registration, privacy policies, data handling.', category: 'technology', areas: ['data_protection'] }),
  C({ id: 'it_security', label: 'IT and cybersecurity specialist', line: 'Checking software, systems and security.', category: 'technology', areas: ['technology'] }),
  // Strategy and growth
  E({ id: 'mentor', label: 'Mentor', line: 'Product, pitch, fundraising.', category: 'growth', areas: ['fundraising', 'business_growth'] }),
  E({ id: 'business_consultant', label: 'Business consultant', line: 'Strategy, operations, entering a new market.', category: 'growth', areas: ['business_growth', 'fundraising'] }),
  E({ id: 'sector_specialist', label: 'Sector specialist', line: 'Deep knowledge of one sector: farming, health, energy...', category: 'growth', areas: ['sector_expertise', 'business_growth'] }),
];

/** Ids the backend accepts. "other" stays for profiles saved before this list. */
export const PROFESSION_IDS = [...PROFESSIONS.map((p) => p.id), 'other'] as const;

export const professionById = (id: string | null | undefined): Profession | undefined => PROFESSIONS.find((p) => p.id === id);

export const regulatorOf = (p: Profession | undefined): Regulator | undefined => (p?.regulator ? REGULATORS[p.regulator] : undefined);

/** Practice areas a profession may offer. Unknown professions may offer none. */
export const allowedAreas = (professionId: string): string[] => professionById(professionId)?.areas ?? [];

/**
 * The checks a person at FoundersLink must record, and pass, before an
 * expert is approved. A check that was never made is never a pass.
 */
export function requiredChecks(professionId: string): CheckType[] {
  const trust = professionById(professionId)?.trust ?? 'experience';
  if (trust === 'licensed') return ['identity', 'professional_register'];
  if (trust === 'certified') return ['identity', 'qualification'];
  return ['identity', 'reference'];
}
