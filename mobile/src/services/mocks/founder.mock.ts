import type { FounderService } from '../types/api';
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
    return { profile, pendingInvestorRequests: 2, documents };
  },
  async getInvestorRequests() {
    await mockDelay();
    return [
      {
        id: 'ir-1',
        investorId: 'u-investor-1',
        investorName: 'James Kariuki',
        focusAreas: ['Agritech', 'Impact'],
        pitchPreview: 'I have backed two agritech startups in Kiambu...',
        fullPitch: 'I have backed two agritech startups in Kiambu and can open retail partnerships.',
        vision: 'Scale farmer payments via M-Pesa and expand to Nakuru.',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
  },
  async respondToInvestorRequest() {
    await mockDelay();
  },
};
