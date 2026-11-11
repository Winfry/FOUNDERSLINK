import { describe, expect, it } from 'vitest';
import { mockAuthService } from '../services/mocks/auth.mock';
import { mockComplianceService } from '../services/mocks/compliance.mock';
import { setMockSessionUserId } from '../services/mocks/mock-session';
import { DEMO_PASSWORD, getMemberById } from '../services/mocks/mock-store';

describe('Readiness items follow the language she chose', () => {
  it('shows the checklist in Kiswahili once she picks Kiswahili, and back in English after', async () => {
    const { user } = await mockAuthService.login({ email: 'amina@healthlink.demo', password: DEMO_PASSWORD });
    setMockSessionUserId(user.id);
    const member = getMemberById(user.id)!;

    const english = await mockComplianceService.listItems();
    expect(english.find((i) => i.id === 'brs')?.label).toBe('Business registration (BRS)');

    member.user.preferredLanguage = 'sw';
    const kiswahili = await mockComplianceService.listItems();
    expect(kiswahili.find((i) => i.id === 'brs')?.label).toBe('Usajili wa biashara (BRS)');
    expect(kiswahili.map((i) => i.status)).toEqual(english.map((i) => i.status));

    member.user.preferredLanguage = 'en';
    expect((await mockComplianceService.listItems()).find((i) => i.id === 'brs')?.label).toBe('Business registration (BRS)');
    setMockSessionUserId(null);
  });
});
