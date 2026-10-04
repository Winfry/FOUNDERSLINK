import type { DealService } from '../types/api';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

export const mockDealService: DealService = {
  async list() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    return member?.deals ?? [];
  },

  async get(dealId) {
    await mockDelay();
    const deals = await this.list();
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) throw { code: 'NOT_FOUND', message: 'Deal not found.' };
    return deal;
  },

  async createInvestment(withUserId, title) {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (!member) throw { code: 'APPROVAL_REQUIRED', message: 'Verify to connect first.' };
    const deal = {
      id: `deal-${Date.now()}`,
      type: 'investment' as const,
      title,
      stage: 'exploring' as const,
      withUserId,
      withName: 'Investor',
      terms: { amountKes: 0, instrument: 'equity' as const },
      confirmations: [],
      checklist: [],
      timeline: [{ id: 't0', title: 'Deal opened', at: new Date().toISOString() }],
      documents: [],
    };
    member.deals.push(deal);
    upsertMember(member);
    return deal;
  },

  async updateTerms(dealId, terms) {
    await mockDelay();
    const deal = await this.get(dealId);
    deal.terms = terms;
    return deal;
  },

  async confirmTerms(dealId) {
    await mockDelay();
    const deal = await this.get(dealId);
    deal.confirmations = deal.confirmations.map((c) =>
      c.userId === getMockSessionUserId() ? { ...c, confirmed: true } : c,
    );
    return deal;
  },

  async advanceStage(dealId) {
    await mockDelay();
    const deal = await this.get(dealId);
    const order = ['exploring', 'due_diligence', 'terms_agreed', 'documents_compliance', 'closed', 'active'] as const;
    const idx = order.indexOf(deal.stage);
    if (idx < order.length - 1) deal.stage = order[idx + 1];
    return deal;
  },

  async uploadDocument(dealId, name) {
    await mockDelay();
    const deal = await this.get(dealId);
    deal.documents.push({
      id: `doc-${Date.now()}`,
      name,
      precheckStatus: 'ai_pre_checked',
      summary: 'AI pre-checked — names and dates align with profile.',
    });
    return deal;
  },
};
