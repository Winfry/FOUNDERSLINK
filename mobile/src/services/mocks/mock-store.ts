import type {
  ApprovalStatus,
  ConsentPurpose,
  Deal,
  FounderProfile,
  FundingMatches,
  SessionUser,
  VettingApplication,
} from '../../types';

export const DEMO_PASSWORD = 'DemoPass2026!';

export interface MockMemberState {
  user: SessionUser;
  password: string;
  founderProfile: FounderProfile | null;
  consents: Record<ConsentPurpose, boolean>;
  vetting: VettingApplication;
  matches: FundingMatches;
  deals: Deal[];
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

const aminaMatches: FundingMatches = {
  applyNow: [
    {
      investorUserId: 'inv-savanna',
      displayName: 'Savanna Angels',
      band: 'strong',
      reasons: [
        { signal: 'sector', fits: true, text: 'Health sector matches their mandate' },
        { signal: 'stage', fits: true, text: 'MVP stage fits their ticket' },
        { signal: 'county', fits: true, text: 'Nairobi is in their preferred counties' },
      ],
      gaps: [],
      riskFactors: [],
      organisationName: 'Savanna Angels',
      anonymised: false,
    },
  ],
  applyAfter: [
    {
      investorUserId: 'inv-coast',
      displayName: 'Angel investor, Mombasa, health, seed',
      band: 'good',
      reasons: [{ signal: 'sector', fits: true, text: 'Health focus aligns' }],
      gaps: [{ kind: 'requirement', text: 'Add your KRA PIN', complianceItemId: 'kra_pin' }],
      riskFactors: [],
      anonymised: true,
    },
  ],
  notForYou: [
    {
      investorUserId: 'inv-north',
      displayName: 'VC fund, Nairobi, growth',
      band: 'not_a_fit',
      reasons: [{ signal: 'ticket', fits: false, text: 'Their minimum ticket is KES 10M' }],
      gaps: [],
      riskFactors: [{ text: 'They charge an application fee before diligence — check terms carefully' }],
      anonymised: true,
    },
  ],
};

const anonymisedMatches: FundingMatches = {
  applyNow: aminaMatches.applyNow.map((m) => ({ ...m, displayName: 'Angel investor, Nairobi, health, seed', anonymised: true })),
  applyAfter: aminaMatches.applyAfter,
  notForYou: aminaMatches.notForYou,
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
        withName: 'Savanna Angels',
        terms: { amountKes: 1_000_000, instrument: 'equity', equityPercent: 12, notes: 'Board observer seat' },
        confirmations: [
          { userId: 'u-amina', name: 'Amina Wanjiru', confirmed: false },
          { userId: 'inv-savanna', name: 'Savanna Angels', confirmed: false },
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
      decisionReason: 'Please clarify your business registration status and resubmit.',
    },
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
  ];
}
