import { mockDelay } from './delay';

export type DiscoverCard = {
  id: string;
  businessName: string;
  sector: string;
  stage: string;
  county: string;
  fundingAskKes: number;
  matchReasons: string[];
  verifiedDocumentsBadge: boolean;
};

/** Investor journey stub until aligned with PRODUCT.md — founder path is primary. */
export const mockInvestorStub = {
  async getProfile() {
    await mockDelay();
    return { bio: '', onboardingComplete: false };
  },
  async saveMatchingQuestionnaire(data: Record<string, unknown>) {
    await mockDelay();
    return data;
  },
  async discover(_params?: Record<string, string>): Promise<DiscoverCard[]> {
    await mockDelay();
    return [];
  },
  async getFounderPublicProfile(id: string) {
    await mockDelay();
    return { id, businessName: 'Founder business' };
  },
  async submitJoinRequest(_founderId: string, _payload: Record<string, unknown>) {
    await mockDelay();
    return { id: 'conn-new' };
  },
  async getJoinRequests(): Promise<
    { id: string; founderBusinessName: string; proposedAmountKes: number; status: string }[]
  > {
    await mockDelay();
    return [];
  },
  async withdrawJoinRequest(_id: string) {
    await mockDelay();
  },
};
