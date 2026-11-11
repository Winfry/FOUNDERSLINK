import type { ComplianceService } from '../types/api';
import { mockDelay } from './delay';
import { getMemberById } from './mock-store';
import { getMockSessionUserId } from './mock-session';

// Each item in English and Kiswahili; the member's language (Settings >
// Language) picks one, as the backend does.
const DEFAULT_ITEMS = [
  { id: 'kra_pin', label: 'KRA PIN', labelSw: 'KRA PIN ya biashara', status: 'in_progress' as const, deadline: '2026-05-01' },
  { id: 'brs', label: 'Business registration (BRS)', labelSw: 'Usajili wa biashara (BRS)', status: 'not_started' as const },
  { id: 'cr12', label: 'CR12', labelSw: 'Cheti cha CR12 (wakurugenzi na wanahisa)', status: 'not_started' as const },
  { id: 'tax_compliance', label: 'Tax compliance certificate', labelSw: 'Cheti cha kufuata sheria za kodi', status: 'not_started' as const },
  { id: 'data_protection', label: 'Data protection registration', labelSw: 'Usajili wa ulinzi wa data (ODPC)', status: 'not_started' as const },
  { id: 'single_business_permit', label: 'Single business permit', labelSw: 'Kibali cha biashara cha kaunti', status: 'complete' as const },
  { id: 'bank_letter', label: 'Bank signatory letter', labelSw: 'Barua ya benki ya watia sahihi', status: 'not_started' as const },
];

export const mockComplianceService: ComplianceService = {
  async listItems() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    const sw = member?.user.preferredLanguage === 'sw';
    const hasKraPin = member?.founderProfile?.alreadyHave.includes('kra_pin') ?? false;
    return DEFAULT_ITEMS.map(({ labelSw, ...item }) => ({
      ...item,
      label: sw ? labelSw : item.label,
      status: item.id === 'kra_pin' && hasKraPin ? ('complete' as const) : item.status,
    }));
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
      citations: [{ title: 'KRA — Starting a business', url: 'https://www.kra.go.ke', lastVerified: '2026-10-04' }],
    };
  },

  async giveFeedback() {
    await mockDelay(200);
  },
};
