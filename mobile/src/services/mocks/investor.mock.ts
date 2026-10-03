import type { InvestorService } from '../types/api';
import { MOCK_FOUNDERS } from './kenya-data';
import { mockDelay } from './delay';

const profile = {
  id: 'ip-1',
  userId: 'u-investor-1',
  bio: 'Angel investor focused on agritech and fintech in Nairobi and central Kenya.',
  ticketMinKes: 500_000,
  ticketMaxKes: 5_000_000,
  preferredSectors: ['agritech', 'fintech'],
  preferredStages: ['mvp', 'early_revenue'],
  preferredCounties: ['Nairobi', 'Kiambu'],
  projectTypes: ['impact', 'agriculture'],
  onboardingComplete: true,
};

export const mockInvestorService: InvestorService = {
  async getProfile() {
    await mockDelay();
    return profile;
  },
  async saveMatchingQuestionnaire(data) {
    await mockDelay();
    return { ...profile, ...data, onboardingComplete: true } as typeof profile;
  },
  async discover(params) {
    await mockDelay();
    let items = [...MOCK_FOUNDERS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter((f) => f.businessName.toLowerCase().includes(q));
    }
    if (params.sector) items = items.filter((f) => f.sector.includes(params.sector!));
    if (params.county) items = items.filter((f) => f.county === params.county);
    return items;
  },
  async getFounderPublicProfile(founderId) {
    await mockDelay();
    const card = MOCK_FOUNDERS.find((f) => f.id === founderId) ?? MOCK_FOUNDERS[0];
    return { ...card, documentsSummary: '4 of 6 key documents verified' };
  },
  async submitJoinRequest() {
    await mockDelay(800);
    return { id: 'jr-new' };
  },
  async getJoinRequests() {
    await mockDelay();
    return [
      {
        id: 'jr-1',
        founderId: 'f1',
        founderBusinessName: 'Maziwa Fresh Co.',
        status: 'pending',
        proposedAmountKes: 1_500_000,
        submittedAt: new Date().toISOString(),
      },
    ];
  },
  async withdrawJoinRequest() {
    await mockDelay();
  },
};
