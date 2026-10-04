import type { InvestorService } from '../http/investor.http';
import { mockDelay } from './delay';

export type { DiscoverCard } from '../http/investor.http';

/** The investor journey on mock data: nothing to discover, nothing saved. */
export const mockInvestorStub: InvestorService = {
  async getSetup() {
    await mockDelay();
    return null;
  },
  async saveSetup() {
    await mockDelay();
  },
  async discover() {
    await mockDelay();
    return { approved: false, count: 0, message: '', founders: [], needsFund: true };
  },
  async getFounderPublicProfile(id) {
    await mockDelay();
    return {
      id,
      founderName: 'Founder',
      businessName: 'Founder business',
      sector: null,
      stage: null,
      county: null,
      description: null,
      fundingAskKes: null,
      useOfFunds: null,
      yearStarted: null,
      website: null,
      ventures: [],
      connection: { id: null, status: 'none' },
    };
  },
  async submitJoinRequest() {
    await mockDelay();
    return { id: 'conn-new' };
  },
  async getJoinRequests() {
    await mockDelay();
    return [];
  },
  async withdrawJoinRequest() {
    await mockDelay();
  },
};
