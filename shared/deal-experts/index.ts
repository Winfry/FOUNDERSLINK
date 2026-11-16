// Who a founder or an investor may need at each step of a deal, and why.
//
// Data, not code: each step lists the kinds of professional who often help,
// what they help with (a practice area from shared/expert-question), and why,
// said from the founder's side and from the investor's. The sector adds its
// own: a farm needs its land checked, a clinic its patient data.
//
// "May need", never "must": not every deal needs everyone, and every list
// says so. Only verified experts are ever suggested for a need, and nothing
// is booked until the member asks. General information, not advice.

export type Side = 'founder' | 'investor';
export type DealStep = 'preparing' | 'exploring' | 'due_diligence' | 'terms_agreed' | 'documents_compliance' | 'closed' | 'active';

export interface Need {
  id: string;
  /** The practice area to search for (shared/expert-question). */
  area: string;
  /** Who, in words: "An accountant or auditor". */
  who: string;
  why: Record<Side, string>;
  /** Only for one side. Both when left out. */
  only?: Side;
}

export const STEP_LABEL: Record<DealStep, string> = {
  preparing: 'Before you raise',
  exploring: 'Exploring',
  due_diligence: 'Due diligence',
  terms_agreed: 'Terms agreed',
  documents_compliance: 'Documents',
  closed: 'Closed',
  active: 'Active',
};

const N = {
  valuer: {
    id: 'valuer',
    area: 'valuation',
    who: 'A valuer or investment adviser',
    why: { founder: 'To know what your business is worth before you agree a price.', investor: 'To check that the price you are asked to pay is fair.' },
  },
  mentor: {
    id: 'mentor',
    area: 'fundraising',
    who: 'A mentor',
    why: { founder: 'To sharpen your pitch and your plan before you meet investors.', investor: '' },
    only: 'founder',
  },
  sectorSpecialist: {
    id: 'sector_specialist',
    area: 'sector_expertise',
    who: 'A sector specialist',
    why: { founder: '', investor: 'To understand how this kind of business makes money, if the sector is new to you.' },
    only: 'investor',
  },
  accountant: {
    id: 'accountant',
    area: 'audit',
    who: 'An accountant or auditor',
    why: { founder: 'To get your books and bank statements ready before the investor checks them.', investor: 'To check the numbers before you invest.' },
  },
  companyAdvocate: {
    id: 'company_advocate',
    area: 'company',
    who: 'An advocate',
    why: { founder: 'To make sure your company papers are in order: registration, CR12 and the contracts you have signed.', investor: 'To check the company papers: who owns it, who runs it, and what it has signed.' },
  },
  dealAdvocate: {
    id: 'deal_advocate',
    area: 'investment_deals',
    who: 'An advocate who does investment deals',
    why: { founder: 'To read the term sheet and shareholders agreement with you before you sign.', investor: 'To draft or read the agreement so that it protects your money.' },
  },
  tax: {
    id: 'tax',
    area: 'tax',
    who: 'A tax agent or accountant',
    why: { founder: 'To know the tax on the investment and on the shares you issue.', investor: 'To understand the tax on your investment and on any returns.' },
  },
  secretaryShares: {
    id: 'secretary_shares',
    area: 'governance',
    who: 'A company secretary',
    why: { founder: 'To issue the new shares, update the share register and file the change with the Business Registration Service.', investor: 'To confirm your shares are issued and recorded in your name.' },
  },
  signingAdvocate: {
    id: 'signing_advocate',
    area: 'contracts',
    who: 'An advocate',
    why: { founder: 'To make sure every document is signed and witnessed correctly.', investor: 'To make sure every document is signed and witnessed correctly.' },
  },
  secretaryRecords: {
    id: 'secretary_records',
    area: 'governance',
    who: 'A company secretary',
    why: { founder: 'To keep the share register and annual returns up to date.', investor: 'To make sure the company keeps its records and holds the meetings agreed.' },
  },
  bookkeeper: {
    id: 'bookkeeper',
    area: 'bookkeeping',
    who: 'An accountant',
    why: { founder: 'To keep books you can report to your investor from.', investor: 'To read the reports the founder sends you, and ask the right questions.' },
  },
  insurance: {
    id: 'insurance',
    area: 'insurance',
    who: 'An insurance broker',
    why: { founder: 'To insure what the money buys: equipment, stock and people.', investor: 'To check that what the money bought is insured.' },
  },
} satisfies Record<string, Need>;

/** Who often helps at each step, most needed first. */
export const STEP_NEEDS: Record<DealStep, Need[]> = {
  // "I am preparing to raise investment": the whole path, in order.
  preparing: [N.mentor, N.valuer, N.accountant, N.companyAdvocate, N.dealAdvocate, N.tax, N.secretaryShares],
  exploring: [N.valuer, N.mentor, N.sectorSpecialist],
  due_diligence: [N.accountant, N.companyAdvocate],
  terms_agreed: [N.dealAdvocate, N.tax],
  documents_compliance: [N.secretaryShares, N.signingAdvocate],
  closed: [N.secretaryRecords, N.bookkeeper, N.insurance],
  active: [N.secretaryRecords, N.bookkeeper, N.insurance],
};

/** What the sector adds, and at which step. */
export const SECTOR_NEEDS: Record<string, Partial<Record<DealStep, Need[]>>> = {
  agri: {
    due_diligence: [
      {
        id: 'land_advocate',
        area: 'land_property',
        who: 'An advocate who knows land law',
        why: { founder: 'To show the land is yours or properly leased: a title deed or a registered lease.', investor: 'To check who owns the land, how long the lease runs, and any loan on the title.' },
      },
      {
        id: 'land_surveyor',
        area: 'land_survey',
        who: 'A land surveyor',
        why: { founder: 'To confirm the farm’s boundaries match the title.', investor: 'To confirm the farm’s boundaries match the title.' },
      },
    ],
  },
  health: {
    due_diligence: [
      {
        id: 'health_data',
        area: 'data_protection',
        who: 'A data protection advocate or consultant',
        why: { founder: 'Patient records are personal data: your ODPC registration and how you keep them.', investor: 'To check patient data is handled lawfully, a common risk in health.' },
      },
    ],
  },
  fintech: {
    due_diligence: [
      {
        id: 'fintech_data',
        area: 'data_protection',
        who: 'A data protection advocate or consultant',
        why: { founder: 'Customer and payment data are personal data: your ODPC registration and how you keep them.', investor: 'To check customer data is handled lawfully, a common risk in fintech.' },
      },
    ],
  },
};

/** For the preparing path: which step each need belongs to, so the plan reads in order. */
const PREPARING_STEP: Record<string, DealStep> = {
  mentor: 'exploring',
  valuer: 'exploring',
  accountant: 'due_diligence',
  company_advocate: 'due_diligence',
  deal_advocate: 'terms_agreed',
  tax: 'terms_agreed',
  secretary_shares: 'documents_compliance',
};

export interface NeedFor {
  id: string;
  area: string;
  who: string;
  why: string;
  /** The step it belongs to ("Due diligence"). */
  step: string;
}

/**
 * Who she may need now, from her side, for a deal at this step in this
 * sector. The sector's own needs come after the step's, so the common ones
 * lead. Never more than `max`.
 */
export function whoYouMayNeed(step: DealStep, opts: { sector?: string | null; side: Side; max?: number }): NeedFor[] {
  const sectorExtra = (s: DealStep) => (opts.sector ? (SECTOR_NEEDS[opts.sector]?.[s] ?? []) : []);
  const base = STEP_NEEDS[step];
  const extra = step === 'preparing' ? sectorExtra('due_diligence') : sectorExtra(step);
  const all = [...base, ...extra].filter((n) => !n.only || n.only === opts.side);
  const seen = new Set<string>();
  const out: NeedFor[] = [];
  for (const n of all) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    const s = step === 'preparing' ? (PREPARING_STEP[n.id] ?? 'due_diligence') : step;
    out.push({ id: n.id, area: n.area, who: n.who, why: n.why[opts.side], step: STEP_LABEL[s] });
  }
  return out.slice(0, opts.max ?? (step === 'preparing' ? 8 : 4));
}

export const MAY_NEED_NOTE =
  'People who often help at this step. Not every deal needs each one: it depends on the deal’s size and sector. Only experts FoundersLink has checked are shown, and nothing is booked until you ask.';

/**
 * Whether a question asks for the whole path rather than one expert:
 * "I'm preparing to raise investment, who will I need?". Returns the step
 * to plan for, or null for an ordinary question.
 */
export function journeyOf(question: string): DealStep | null {
  const t = question.toLowerCase();
  if (/\bdue diligence\b/.test(t) && /\b(who|need|help)\b/.test(t)) return 'due_diligence';
  if (/(clos(e|ing) (the|a|my|this) (deal|investment)|investor (is|has) (agreed|ready|said yes))/.test(t)) return 'documents_compliance';
  if (/(prepar\w*|getting ready|about to|planning|plan) (to |for )?(raise|raising|fundrais|invest\w*|an? investment|make an investment)/.test(t)) return 'preparing';
  if (/\b(raise|raising) (investment|money|funds|funding|capital)\b/.test(t)) return 'preparing';
  if (/kutafuta (fedha|uwekezaji|wawekezaji)|kuchangisha/.test(t)) return 'preparing';
  return null;
}

// ---------------------------------------------------------------------------
// Matching each need to the best verified expert who offers it.

export interface ExpertForNeed {
  user_id: string;
  practice_areas: string[];
  sectors: string[];
  office_hours: { left_this_month: number };
  helped: number;
}

export interface PlanStep<E> extends NeedFor {
  /** The best verified expert for it, or null when none offers it yet. */
  expert: E | null;
}

/**
 * For each need, the verified expert who offers it and fits best: one who
 * works in the sector, then one who can take a session this month, then
 * the most experienced. A different person for each need when there is
 * one, so the list is not the same name again and again.
 */
export function matchNeeds<E extends ExpertForNeed>(needs: NeedFor[], experts: E[], sector?: string | null): PlanStep<E>[] {
  const used = new Set<string>();
  const score = (e: E) =>
    (sector && e.sectors.includes(sector) ? 4 : e.sectors.length === 0 ? 1 : 0) + (e.office_hours.left_this_month > 0 ? 2 : 0);
  return needs.map((need) => {
    const offering = experts
      .filter((e) => e.practice_areas.includes(need.area))
      .sort((a, b) => score(b) - score(a) || b.helped - a.helped);
    const expert = offering.find((e) => !used.has(e.user_id)) ?? offering[0] ?? null;
    if (expert) used.add(expert.user_id);
    return { ...need, expert };
  });
}

/** What the Co-pilot says before the plan, from her side. */
export function planIntro(step: DealStep, side: Side): string {
  if (step === 'preparing') {
    return side === 'founder'
      ? 'Raising investment usually goes in steps: getting ready, the investor’s checks (due diligence), agreeing the terms, then the documents. Here is who often helps at each step, with a verified expert for each. Not every deal needs everyone.'
      : 'An investment usually goes in steps: getting to know the business, your checks (due diligence), agreeing the terms, then the documents. Here is who often helps at each step, with a verified expert for each. Not every deal needs everyone.';
  }
  return `At ${STEP_LABEL[step].toLowerCase()}, these people often help. Not every deal needs each one.`;
}
