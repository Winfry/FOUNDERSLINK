import type { FounderService } from '../types/api';
import { MOCK_PLATFORM_FOUNDER_PEERS, MOCK_PLATFORM_INVESTORS } from './kenya-data';
import { mockDelay } from './delay';

const profile = {
  id: 'fp-1',
  userId: 'u-founder-1',
  businessName: 'Maziwa Fresh Co.',
  sectorId: 'agritech',
  stage: 'early_revenue' as const,
  county: 'Kiambu',
  yearStarted: 2022,
  description: 'Cold-chain dairy distribution for smallholder farmers in central Kenya.',
  profileCompleteness: 78,
  fundsRaisedKes: 2_975_000,
  fundingTargetKes: 8_500_000,
  verifiedDocumentsCount: 4,
  totalDocumentsCount: 8,
  onboardingStep: 5,
  onboardingComplete: true,
};

const documents = [
  { id: 'd1', type: 'brs', label: 'Certificate of Incorporation (BRS)', status: 'verified' as const },
  { id: 'd2', type: 'cr12', label: 'CR12', status: 'verified' as const },
  { id: 'd3', type: 'kra_pin', label: 'KRA PIN Certificate', status: 'under_review' as const },
  { id: 'd4', type: 'tax_compliance', label: 'Tax Compliance Certificate', status: 'uploaded' as const },
  { id: 'd5', type: 'sbp', label: 'Single Business Permit', status: 'not_uploaded' as const },
];

const investorRequests = [
  {
    id: 'ir-grace',
    investorId: 'inv-grace',
    investorName: 'Grace Wambui',
    focusAreas: ['Health', 'Edtech'],
    pitchPreview: 'I mentor two edtech founders and can support your expansion into schools...',
    fullPitch:
      'I mentor two edtech founders in Kiambu and can support your expansion into schools and clinics with introductions.',
    vision: 'Co-invest alongside strategic angels in central Kenya.',
    status: 'pending' as const,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'ir-james',
    investorId: 'inv-james',
    investorName: 'James Kariuki',
    focusAreas: ['Agritech', 'Impact'],
    pitchPreview: 'I have backed two agritech startups in Kiambu...',
    fullPitch: 'I have backed two agritech startups in Kiambu and can open retail partnerships.',
    vision: 'Scale farmer payments via M-Pesa and expand to Nakuru.',
    status: 'approved' as const,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'ir-amina',
    investorId: 'inv-amina',
    investorName: 'Amina Hassan',
    focusAreas: ['Fintech', 'Women-led'],
    pitchPreview: 'Looking to support women-led agribusiness with ticket sizes from KES 1M...',
    fullPitch:
      'Looking to support women-led agribusiness with ticket sizes from KES 1M and hands-on governance support.',
    vision: 'Build a portfolio of coastal and central Kenya impact deals.',
    status: 'approved' as const,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'ir-david',
    investorId: 'inv-david',
    investorName: 'David Otieno',
    focusAreas: ['Logistics', 'Commercial'],
    pitchPreview: 'Former logistics operator — can help with cold-chain partners...',
    fullPitch: 'Former logistics operator — can help with cold-chain partners and working-capital discipline.',
    vision: 'Back operational founders in agriculture and mobility.',
    status: 'approved' as const,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
];

export const mockFounderService: FounderService = {
  async getProfile() {
    await mockDelay();
    return profile;
  },
  async saveOnboardingStep(step, data) {
    await mockDelay();
    return { ...profile, onboardingStep: step, ...data } as typeof profile;
  },
  async getDocuments() {
    await mockDelay();
    return documents;
  },
  async getDashboard() {
    await mockDelay();
    const pendingInvestorRequests = investorRequests.filter((r) => r.status === 'pending').length;
    return {
      profile,
      pendingInvestorRequests,
      documents,
      platformInvestors: MOCK_PLATFORM_INVESTORS,
      platformFounders: MOCK_PLATFORM_FOUNDER_PEERS,
    };
  },
  async getInvestorRequests() {
    await mockDelay();
    return investorRequests;
  },
  async getPlatformInvestors() {
    await mockDelay();
    return MOCK_PLATFORM_INVESTORS;
  },
  async respondToInvestorRequest() {
    await mockDelay();
  },
};
