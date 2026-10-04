import type { FundingService } from '../types/api';
import { mockDelay } from './delay';
import { getMemberById } from './mock-store';
import { getMockSessionUserId } from './mock-session';

export const mockFundingService: FundingService = {
  async getMatches() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (!member) {
      return { applyNow: [], applyAfter: [], notForYou: [] };
    }
    if (!member.consents.ai_matching) {
      return { applyNow: [], applyAfter: [], notForYou: [] };
    }
    return member.matches;
  },

  async getInvestorProfile(investorUserId) {
    await mockDelay();
    return {
      investorUserId,
      displayName: investorUserId === 'inv-savanna' ? 'Savanna Angels' : 'Investor',
      reasons: [
        { signal: 'sector', fits: true, text: 'Health sector matches their mandate' },
        { signal: 'stage', fits: true, text: 'MVP stage fits their ticket' },
      ],
      whatTheyFund: 'Health, fintech, climate — MVP to early revenue in Nairobi and Mombasa.',
      trackRecord: [
        { label: 'Backed 2 health businesses at MVP (1 Verified on FounderLink)', source: 'platform_deal' },
        { label: 'Published portfolio on their website', source: 'public' },
      ],
    };
  },
};
