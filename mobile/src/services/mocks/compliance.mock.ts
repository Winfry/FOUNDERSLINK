import type { ComplianceService } from '../types/api';
import { mockDelay } from './delay';
import { getMemberById } from './mock-store';
import { getMockSessionUserId } from './mock-session';

const DEFAULT_ITEMS = [
  { id: 'kra_pin', label: 'KRA PIN', status: 'in_progress' as const, deadline: '2026-05-01' },
  { id: 'brs', label: 'Business registration (BRS)', status: 'not_started' as const },
  { id: 'cr12', label: 'CR12', status: 'not_started' as const },
  { id: 'tax_compliance', label: 'Tax compliance certificate', status: 'not_started' as const },
  { id: 'data_protection', label: 'Data protection registration', status: 'not_started' as const },
  { id: 'single_business_permit', label: 'Single business permit', status: 'complete' as const },
  { id: 'bank_letter', label: 'Bank signatory letter', status: 'not_started' as const },
];

export const mockComplianceService: ComplianceService = {
  async listItems() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (member?.founderProfile?.alreadyHave.includes('kra_pin')) {
      return DEFAULT_ITEMS.map((i) => (i.id === 'kra_pin' ? { ...i, status: 'complete' as const } : i));
    }
    return DEFAULT_ITEMS;
  },

  async updateItemStatus(itemId, status) {
    await mockDelay();
    const items = await this.listItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) throw { code: 'NOT_FOUND', message: 'Compliance item not found.' };
    const updated = { ...item, status };
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (member && itemId === 'kra_pin' && status === 'complete') {
      member.founderProfile = member.founderProfile
        ? {
            ...member.founderProfile,
            alreadyHave: [...new Set([...member.founderProfile.alreadyHave, 'kra_pin'])],
          }
        : null;
      member.matches.applyAfter = member.matches.applyAfter.filter(
        (c) => !c.gaps.some((g) => g.complianceItemId === 'kra_pin'),
      );
    }
    return updated;
  },

  async ask(question) {
    await mockDelay(700);
    void question;
    return {
      body: 'Registered companies need a valid KRA PIN before issuing invoices. Source: KRA guide for startups.',
      citations: [{ title: 'KRA — Starting a business', url: 'https://www.kra.go.ke' }],
    };
  },
};
