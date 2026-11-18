import type { FundingService } from '../types/api';
import { mockDelay } from './delay';
import { getMemberById, INVESTOR_FACTS } from './mock-store';
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
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    const m = member?.matches;
    const card = m ? [...m.applyNow, ...m.applyAfter, ...m.notForYou].find((c) => c.investorUserId === investorUserId) : undefined;
    if (!card) throw { code: 'NOT_FOUND', message: 'This match is no longer available.' };
    const facts = card.anonymised ? undefined : INVESTOR_FACTS[investorUserId];
    return {
      investorUserId,
      connectUserId: card.personUserId ?? null,
      displayName: card.displayName,
      // The demo's faces come from its portraits (src/lib/portraits.ts), by name.
      photoUrl: card.photoUrl ?? null,
      organisationName: card.organisationName ?? null,
      title: facts?.title ?? null,
      anonymised: card.anonymised,
      band: card.band,
      reasons: card.reasons,
      gaps: card.gaps,
      riskFactors: card.riskFactors,
      ticket: card.ticket,
      dealsClosed: facts?.dealsClosed ?? null,
      investingSince: facts?.investingSince ?? null,
      verified: !card.anonymised && Boolean(facts),
      whatTheyFund: card.anonymised ? '' : 'Health businesses in Kenya, from a product in use to early revenue.',
      trackRecord: facts
        ? [
            { label: 'A Nairobi clinic chain, seed, 2023', source: 'platform_deal' },
            { label: 'A pharmacy delivery app, pre-seed, 2022', source: 'public' },
          ]
        : [],
    };
  },
};
