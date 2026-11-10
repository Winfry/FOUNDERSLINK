// The demo investor's and expert's world: the businesses an investor can
// discover, and the founders who ask an expert for a session. Sample data
// for trying the app without the backend; none of it is a real person.

import type { DiscoverCard, FounderPublicProfile, InvestorSetup, JoinRequestRow } from '../http/investor.http';
import type { ExpertSession } from '../http/expert.http';

export const savannaSetup: InvestorSetup = {
  organisationName: 'Savanna Angels',
  jobTitle: 'Lead partner',
  bio: 'An angel network backing early health and fintech businesses in Kenya.',
  kind: 'angel',
  mandateText: 'We back early health and fintech startups in Kenya that already have paying customers and a founder who knows the market first-hand.',
  sectors: ['health', 'fintech'],
  stages: ['mvp', 'early_revenue'],
  counties: ['Nairobi', 'Mombasa', 'Kisumu'],
  instruments: ['equity', 'convertible_note'],
  ticketMinKes: 500_000,
  ticketMaxKes: 5_000_000,
};

interface DemoBusiness {
  card: Omit<DiscoverCard, 'anonymised'>;
  profile: Omit<FounderPublicProfile, 'connection'>;
}

const business = (
  id: string,
  founderName: string,
  businessName: string,
  sector: string,
  stage: string,
  county: string,
  description: string,
  fundingAskKes: number,
  band: DiscoverCard['band'],
  matchReasons: string[],
  ready: boolean,
  extra: Partial<FounderPublicProfile> = {},
): DemoBusiness => ({
  card: {
    id,
    headline: `${sector === 'agri' ? 'Agriculture' : sector.charAt(0).toUpperCase() + sector.slice(1)} business, ${county}, seeking KSh ${fundingAskKes.toLocaleString('en-KE')}`,
    businessName,
    founderName,
    sector,
    stage,
    county,
    description,
    fundingAskKes,
    band,
    matchReasons,
    ready,
  },
  profile: {
    id,
    founderName,
    businessName,
    sector,
    stage,
    county,
    description,
    fundingAskKes,
    useOfFunds: null,
    yearStarted: 2024,
    website: null,
    ventures: [],
    ...extra,
  },
});

export const demoBusinesses: DemoBusiness[] = [
  business('u-amina', 'Amina Wanjiru', 'ClinicBook Health', 'health', 'mvp', 'Nairobi',
    'Patients book visits at small clinics and get follow-up reminders by SMS. 12 clinics use it today.',
    1_000_000, 'strong', ['Health is one of your sectors', 'MVP stage is in your range', 'Nairobi is one of your counties'], true,
    { useOfFunds: 'Two sales hires and an Android app for clinic receptionists.', yearStarted: 2024, website: 'https://clinicbook.demo' }),
  business('u-faith', 'Faith Achieng', 'PesaPlan', 'fintech', 'early_revenue', 'Kisumu',
    'Budgeting and savings goals for market traders, paid through M-Pesa. 3,400 active users.',
    2_500_000, 'strong', ['Fintech is one of your sectors', 'Early revenue is in your range', 'The amount fits your ticket'], true,
    { useOfFunds: 'Expand to Nakuru and Eldoret markets.', yearStarted: 2023 }),
  business('u-otieno', 'Kevin Otieno', 'Afya Mtaani', 'health', 'idea', 'Mombasa',
    'Community health workers book home visits for elderly patients through a simple app.',
    800_000, 'good', ['Health is one of your sectors', 'Mombasa is one of your counties'], false,
    { yearStarted: 2026 }),
  business('u-njeri', 'Njeri Mwangi', 'Shamba Fresh', 'agri', 'early_revenue', 'Nakuru',
    'Farmers sell vegetables straight to Nairobi restaurants, with next-day delivery.',
    3_000_000, 'possible', ['The amount fits your ticket'], true,
    { yearStarted: 2022 }),
];

export const savannaRequests: JoinRequestRow[] = [
  {
    id: 'jr-1',
    founderId: 'u-amina',
    founderName: 'Amina Wanjiru',
    proposedAmountKes: 1_000_000,
    pitch: 'We like ClinicBook and can open hospital partnerships.',
    status: 'accepted',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'jr-2',
    founderId: 'u-faith',
    founderName: 'Faith Achieng',
    proposedAmountKes: 2_000_000,
    pitch: 'Your traders are exactly who our members want to reach.',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const expertSessions: ExpertSession[] = [
  {
    id: 'oh-1',
    topic: 'Do I need to register with the Data Commissioner before launching my clinic app?',
    status: 'requested',
    role: 'expert',
    with: { id: 'u-amina', full_name: 'Amina Wanjiru' },
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'oh-2',
    topic: 'Reviewing a convertible note before I sign it.',
    status: 'accepted',
    role: 'expert',
    with: { id: 'u-faith', full_name: 'Faith Achieng' },
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'oh-3',
    topic: 'Registering a limited company instead of a business name.',
    status: 'done',
    role: 'expert',
    with: { id: 'u-njeri', full_name: 'Njeri Mwangi' },
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
];
