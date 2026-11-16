import type {
  ApprovalStatus,
  ConsentPurpose,
  Deal,
  FounderProfile,
  FundingMatches,
  InvestorMatchCard,
  SessionUser,
  VettingApplication,
} from '../../types';
import type { InvestorSetup, JoinRequestRow } from '../http/investor.http';
import type { ExpertSession } from '../http/expert.http';
import type { CopilotActivity, CopilotTask } from '../http/copilot.http';
import { expertSessions, savannaRequests, savannaSetup } from './demo-people';

export const DEMO_PASSWORD = 'DemoPass2026!';

export interface MockMemberState {
  user: SessionUser;
  password: string;
  founderProfile: FounderProfile | null;
  /** What she has answered; a consent never answered is not granted. */
  consents: Partial<Record<ConsentPurpose, boolean>>;
  vetting: VettingApplication;
  matches: FundingMatches;
  deals: Deal[];
  /** An investor's: what she funds, and the requests she sent. */
  investorSetup?: InvestorSetup;
  joinRequests?: JoinRequestRow[];
  /** An expert's: the help sessions founders asked her for. */
  sessions?: ExpertSession[];
  /** A founder's: her task list and what the Copilot did. */
  tasks?: CopilotTask[];
  copilotLog?: CopilotActivity[];
}

const members = new Map<string, MockMemberState>();

function baseFounderProfile(overrides: Partial<FounderProfile> = {}): FounderProfile {
  return {
    businessName: 'ClinicBook Health',
    sector: 'health',
    stage: 'mvp',
    county: 'Nairobi',
    description: 'App ya kubook clinic visits na follow-up reminders.',
    fundingAmountKes: 1_000_000,
    journeyType: 'startup',
    businessStatus: 'registered_business_name',
    instruments: ['equity', 'convertible_note'],
    hasEmployees: true,
    handlesPersonalData: true,
    alreadyHave: ['kra_pin'],
    profileCompleteness: 82,
    yearStarted: 2024,
    ...overrides,
  };
}

// The investors who fit Amina's ClinicBook, as in the approved design.
const card = (
  id: string,
  name: string,
  org: string,
  ticket: string,
  band: InvestorMatchCard['band'],
  reasons: [string, boolean, string][],
  gaps: string[] = [],
): InvestorMatchCard => ({
  investorUserId: id,
  personUserId: id,
  displayName: name,
  organisationName: org,
  ticket,
  band,
  reasons: reasons.map(([signal, fits, text]) => ({ signal, fits, text })),
  gaps: gaps.map((text) => ({ kind: 'requirement' as const, text })),
  riskFactors: [],
  anonymised: false,
});

const aminaMatches: FundingMatches = {
  applyNow: [
    card('inv-lakeside', 'David Otieno', 'Lakeside Ventures', 'KES 1–5M', 'strong', [
      ['sector', true, 'Invests in health technology'],
      ['amount', true, 'Your KES 1M ask is in his range'],
      ['stage', true, 'Backs products already in use'],
    ]),
    card('inv-savanna', 'Grace Njoroge', 'Savanna Angels', 'KES 0.5–2M', 'strong', [
      ['sector', true, 'Health is one of the three sectors she funds'],
      ['amount', true, 'Your KES 1M ask is in her range'],
      ['county', true, 'Nairobi is one of her counties'],
    ]),
    card('inv-syndicate', 'Wairimu Kimani', 'Nairobi Health Syndicate', 'KES 0.3–1M', 'good', [
      ['sector', true, 'Funds clinics and health apps only'],
      ['amount', true, 'Your KES 1M ask is at the top of her range'],
    ]),
  ],
  applyAfter: [
    card('inv-pwani', 'Fatuma Hassan', 'Pwani Impact Fund', 'KES 0.3–1.5M', 'good', [['sector', true, 'Funds health businesses']], ['Bank account in the business name']),
    card('inv-rift', 'James Mutua', 'Rift Angels', 'KES 0.5–1M', 'possible', [['amount', true, 'Your ask is in his range']], ['CR12']),
  ],
  notForYou: [
    card('inv-shamba', 'Peter Kamau', 'Shamba Capital', 'Farming only', 'not_a_fit', [['sector', false, 'Funds farming businesses only']]),
    card('inv-coast', 'Ann Njoroge', 'Coast Ventures', 'Mombasa only', 'not_a_fit', [['county', false, 'Funds businesses in Mombasa only']]),
    card('inv-growth', 'Samuel Ouma', 'Growth Partners', 'KES 20M+', 'not_a_fit', [['amount', false, 'Their smallest investment is KES 20M']]),
    card('inv-retail', 'Lucy Wambui', 'Retail Fund', 'Retail only', 'not_a_fit', [['sector', false, 'Funds retail businesses only']]),
  ],
};

/** What each demo investor shows at the top of their page. */
export const INVESTOR_FACTS: Record<string, { title: string; dealsClosed: number; investingSince: number }> = {
  'inv-lakeside': { title: 'Partner', dealsClosed: 14, investingSince: 2019 },
  'inv-savanna': { title: 'Lead angel', dealsClosed: 9, investingSince: 2020 },
  'inv-syndicate': { title: 'Founder', dealsClosed: 6, investingSince: 2021 },
  'inv-pwani': { title: 'Fund manager', dealsClosed: 11, investingSince: 2018 },
  'inv-rift': { title: 'Angel investor', dealsClosed: 4, investingSince: 2022 },
};

// Before she is verified, a founder sees what each investor funds, not who they are.
const anonymisedMatches: FundingMatches = {
  applyNow: aminaMatches.applyNow.map((m) => ({ ...m, displayName: 'Angel investor · Health', organisationName: undefined, anonymised: true })),
  applyAfter: aminaMatches.applyAfter.map((m) => ({ ...m, displayName: 'Angel investor · Health', organisationName: undefined, anonymised: true })),
  notForYou: aminaMatches.notForYou.map((m) => ({ ...m, displayName: 'Investor', organisationName: undefined, anonymised: true })),
};

function seedMember(
  email: string,
  user: SessionUser,
  extra: Partial<Omit<MockMemberState, 'user' | 'password'>>,
) {
  members.set(email.toLowerCase(), {
    password: DEMO_PASSWORD,
    founderProfile: null,
    consents: { profile_visibility: false, ai_matching: false, contact: false },
    vetting: { approvalStatus: 'draft' },
    matches: anonymisedMatches,
    deals: [],
    ...extra,
    user,
  });
}

function init() {
  if (members.size > 0) return;

  seedMember('amina@healthlink.demo', {
    id: 'u-amina',
    role: 'founder',
    email: 'amina@healthlink.demo',
    fullName: 'Amina Wanjiru',
    phone: '+254712000111',
    emailVerified: true,
    approvalStatus: 'approved',
    preferredLanguage: 'en',
    founderOnboardingComplete: true,
    investorOnboardingComplete: false,
  }, {
    founderProfile: baseFounderProfile(),
    consents: { profile_visibility: true, ai_matching: true, contact: true },
    vetting: { approvalStatus: 'approved', phone: '+254712000111', statement: 'We run ClinicBook in Nairobi.' },
    matches: aminaMatches,
    deals: [
      {
        id: 'deal-1',
        type: 'investment',
        title: 'ClinicBook — seed with Savanna Angels',
        stage: 'exploring',
        withUserId: 'inv-savanna',
        withName: 'Grace Njoroge',
        terms: { amountKes: 1_000_000, instrument: 'equity', equityPercent: 12, notes: 'Board observer seat' },
        confirmations: [
          { userId: 'u-amina', name: 'Amina Wanjiru', confirmed: false },
          { userId: 'inv-savanna', name: 'Grace Njoroge', confirmed: false },
        ],
        checklist: [{ id: 'c1', label: 'Align on instrument', done: true }],
        timeline: [{ id: 't1', title: 'Deal opened', at: new Date().toISOString() }],
        documents: [],
      },
    ],
  });

  seedMember('new@founder.demo', {
    id: 'u-new',
    role: 'founder',
    email: 'new@founder.demo',
    fullName: 'Brian Otieno',
    emailVerified: false,
    approvalStatus: 'draft',
    preferredLanguage: 'en',
    founderOnboardingComplete: false,
    investorOnboardingComplete: false,
  }, {});

  seedMember('waiting@founder.demo', {
    id: 'u-wait',
    role: 'founder',
    email: 'waiting@founder.demo',
    fullName: 'Grace Mwangi',
    emailVerified: true,
    approvalStatus: 'in_review',
    preferredLanguage: 'en',
    founderOnboardingComplete: true,
    investorOnboardingComplete: false,
  }, {
    founderProfile: baseFounderProfile({ businessName: 'Kilifi Aqua Farms', county: 'Kilifi', sector: 'agri' }),
    consents: { profile_visibility: true, ai_matching: true, contact: false },
    vetting: {
      approvalStatus: 'in_review',
      phone: '+254733000222',
      statement: 'We farm tilapia in Kilifi and sell to Mombasa hotels.',
    },
  });

  seedMember('needsinfo@founder.demo', {
    id: 'u-info',
    role: 'founder',
    email: 'needsinfo@founder.demo',
    fullName: 'Peter Kamau',
    emailVerified: true,
    approvalStatus: 'needs_info',
    preferredLanguage: 'en',
    founderOnboardingComplete: true,
    investorOnboardingComplete: false,
  }, {
    founderProfile: baseFounderProfile({ businessName: 'PesaLink Solutions', sector: 'fintech' }),
    consents: { profile_visibility: true, ai_matching: false, contact: true },
    vetting: {
      approvalStatus: 'needs_info',
      phone: '+254711000333',
      statement: 'Payments API for chamas and savings groups.',
      statusReason: 'Please clarify your business registration status and resubmit.',
    },
  });

  // An approved investor: what she funds, businesses that fit it, two
  // requests (one accepted, with the deal Amina is in on the other side).
  seedMember('grace@savanna.demo', {
    id: 'inv-savanna',
    role: 'investor',
    email: 'grace@savanna.demo',
    fullName: 'Grace Njoroge',
    phone: '+254722000444',
    emailVerified: true,
    approvalStatus: 'approved',
    preferredLanguage: 'en',
    founderOnboardingComplete: false,
    investorOnboardingComplete: true,
  }, {
    vetting: { approvalStatus: 'approved', phone: '+254722000444', statement: 'Savanna Angels backs early health and fintech startups.' },
    investorSetup: savannaSetup,
    joinRequests: savannaRequests,
    deals: [
      {
        id: 'deal-1',
        type: 'investment',
        title: 'ClinicBook — seed with Savanna Angels',
        stage: 'exploring',
        withUserId: 'u-amina',
        withName: 'Amina Wanjiru',
        terms: { amountKes: 1_000_000, instrument: 'equity', equityPercent: 12, notes: 'Board observer seat' },
        confirmations: [
          { userId: 'inv-savanna', name: 'Savanna Angels', confirmed: false },
          { userId: 'u-amina', name: 'Amina Wanjiru', confirmed: false },
        ],
        checklist: [{ id: 'c1', label: 'Align on instrument', done: true }],
        timeline: [{ id: 't1', title: 'Deal opened', at: new Date().toISOString() }],
        documents: [],
      },
      // Two closed investments, for "My investments": one going well,
      // one with a goal that is late.
      {
        id: 'deal-pesaplan',
        type: 'investment',
        title: 'PesaPlan seed round',
        stage: 'active',
        withUserId: 'u-faith',
        withName: 'Faith Achieng',
        terms: { amountKes: 2_000_000, instrument: 'convertible_note', notes: 'Converts at the next priced round' },
        confirmations: [
          { userId: 'inv-savanna', name: 'Savanna Angels', confirmed: true },
          { userId: 'u-faith', name: 'Faith Achieng', confirmed: true },
        ],
        checklist: [],
        timeline: [{ id: 't1', title: 'Deal closed', at: '2026-03-02T09:00:00.000Z' }],
        documents: [],
        closedAt: '2026-03-02T09:00:00.000Z',
        milestones: [
          { id: 'm1', title: 'Reach 5,000 active traders', dueDate: '2026-06-30T00:00:00.000Z', status: 'done' },
          { id: 'm2', title: 'Open in Nakuru and Eldoret', dueDate: '2026-09-30T00:00:00.000Z', status: 'pending' },
        ],
        sharesTrackRecord: false,
      },
      {
        id: 'deal-shambafresh',
        type: 'investment',
        title: 'Shamba Fresh growth round',
        stage: 'active',
        withUserId: 'u-njeri',
        withName: 'Njeri Mwangi',
        terms: { amountKes: 1_500_000, instrument: 'equity', equityPercent: 10 },
        confirmations: [
          { userId: 'inv-savanna', name: 'Savanna Angels', confirmed: true },
          { userId: 'u-njeri', name: 'Njeri Mwangi', confirmed: true },
        ],
        checklist: [],
        timeline: [{ id: 't1', title: 'Deal closed', at: '2025-10-20T09:00:00.000Z' }],
        documents: [],
        closedAt: '2025-10-20T09:00:00.000Z',
        milestones: [
          { id: 'm1', title: 'Supply 50 Nairobi restaurants', dueDate: '2026-02-28T00:00:00.000Z', status: 'done' },
          { id: 'm2', title: 'Open a second collection centre', dueDate: '2026-08-31T00:00:00.000Z', status: 'done' },
        ],
        sharesTrackRecord: true,
      },
    ],
  });

  // An approved expert, with founders asking for her help.
  seedMember('wanjiku@expert.demo', {
    id: 'exp-wanjiku',
    role: 'expert',
    email: 'wanjiku@expert.demo',
    fullName: 'Wanjiku Kamau',
    phone: '+254700000555',
    emailVerified: true,
    approvalStatus: 'approved',
    preferredLanguage: 'en',
    founderOnboardingComplete: false,
    investorOnboardingComplete: false,
    expertOnboardingComplete: true,
  }, {
    vetting: { approvalStatus: 'approved', phone: '+254700000555', statement: 'Advocate of the High Court, helping startups with company law and data protection.' },
    sessions: expertSessions,
  });
}

init();

export function getMemberByEmail(email: string): MockMemberState | undefined {
  init();
  return members.get(email.trim().toLowerCase());
}

export function getMemberById(id: string): MockMemberState | undefined {
  init();
  for (const m of members.values()) {
    if (m.user.id === id) return m;
  }
  return undefined;
}

export function upsertMember(state: MockMemberState) {
  members.set(state.user.email.toLowerCase(), state);
}

export function listDemoAccounts() {
  init();
  return [
    { email: 'amina@healthlink.demo', label: 'Verified founder — matches + deal', password: DEMO_PASSWORD },
    { email: 'new@founder.demo', label: 'New founder — onboarding', password: DEMO_PASSWORD },
    { email: 'waiting@founder.demo', label: 'Verification in review', password: DEMO_PASSWORD },
    { email: 'needsinfo@founder.demo', label: 'Verification needs more info', password: DEMO_PASSWORD },
    { email: 'grace@savanna.demo', label: 'Verified investor — matched businesses + deal', password: DEMO_PASSWORD },
    { email: 'wanjiku@expert.demo', label: 'Verified expert — session requests', password: DEMO_PASSWORD },
  ];
}
