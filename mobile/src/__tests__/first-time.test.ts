import { describe, expect, it } from 'vitest';
import { suggestFromText } from '../services/mocks/founder-profile.mock';
import { mockAuthService } from '../services/mocks/auth.mock';

describe('a first-time founder: suggestions from her own words', () => {
  it('reads the sector, county, amount and stage she wrote, not a fixed example', () => {
    const s = suggestFromText('We run Shamba Fresh, a dairy farm in Nakuru, and want to raise KES 2 million for a milk cooler.');
    expect(s).toMatchObject({ sector: 'agri', county: 'Nakuru', fundingAmountKes: 2_000_000, stage: 'mvp', businessName: 'Shamba Fresh' });
  });

  it('understands Kiswahili', () => {
    expect(suggestFromText('Tuna kliniki Kisumu, tunahitaji milioni mbili. Wateja 300.')).toMatchObject({ county: 'Kisumu', fundingAmountKes: 2_000_000, stage: 'early_revenue' });
  });

  it('leaves out what it cannot tell, rather than making it up', () => {
    const s = suggestFromText('hello');
    expect(s.sector).toBeUndefined();
    expect(s.county).toBeUndefined();
    expect(s.fundingAmountKes).toBeUndefined();
    expect(s.businessName).toBeUndefined();
  });
});

describe('a first-time member sets up her own side first', () => {
  for (const role of ['founder', 'investor', 'expert'] as const) {
    it(`a new ${role} is sent to set up before the app`, async () => {
      const { user } = await mockAuthService.signup({
        fullName: 'New Member',
        email: `${role}-${Math.random().toString(36).slice(2)}@first.demo`,
        password: 'NewPass2026!x',
        role,
        acceptTerms: true,
      } as never);
      expect({ founder: user.founderOnboardingComplete, investor: user.investorOnboardingComplete, expert: user.expertOnboardingComplete }[role]).toBe(false);
    });
  }
});

describe('a brand-new member starts with her own, empty inbox', () => {
  it('no sample messages, requests or notices; the demo accounts keep theirs', async () => {
    const { setMockSessionUserId } = await import('../services/mocks/mock-session');
    const { mockConversationService } = await import('../services/mocks/conversation.mock');
    const { mockConnectionService } = await import('../services/mocks/connection.mock');
    const { mockNotificationService } = await import('../services/mocks/notifications.mock');

    setMockSessionUserId('u-brand-new');
    expect(await mockConversationService.list()).toEqual([]);
    expect(await mockConnectionService.list()).toEqual([]);
    expect((await mockNotificationService.list()).unreadCount).toBe(0);
    // Her own request is on her list.
    await mockConnectionService.request('inv-lakeside', 'I would like to connect about my business.');
    expect((await mockConnectionService.list()).map((r) => r.withUserId)).toEqual(['inv-lakeside']);

    setMockSessionUserId('u-amina');
    expect((await mockConversationService.list()).length).toBeGreaterThan(0);
    expect((await mockConnectionService.list()).some((r) => r.withUserId === 'inv-savanna')).toBe(true);
    setMockSessionUserId(null);
  });
});

describe('a brand-new investor sees the businesses that fit what she funds', () => {
  it('only the sectors and stages she chose', async () => {
    const { setMockSessionUserId } = await import('../services/mocks/mock-session');
    const { mockInvestorStub } = await import('../services/mocks/investor-stub.mock');
    const { user } = await mockAuthService.signup({ fullName: 'Njoki Wambui', email: `inv-${Math.random().toString(36).slice(2)}@first.demo`, password: 'NewPass2026!x', role: 'investor', acceptTerms: true } as never);
    setMockSessionUserId(user.id);
    expect((await mockInvestorStub.discover({})).needsFund).toBe(true);
    await mockInvestorStub.saveSetup({ kind: 'angel', organisationName: 'Wambui Family Office', sectors: ['health', 'agri'], stages: ['mvp', 'early_revenue'], instruments: ['equity'], counties: [], ticketMinKes: 500_000, ticketMaxKes: 2_000_000, thesis: 'Farms and clinics with paying customers.' } as never);
    const found = await mockInvestorStub.discover({});
    expect(found.founders.map((f) => [f.sector, f.stage])).toEqual([['health', 'mvp'], ['agri', 'early_revenue']]);
    // Not verified yet: no names.
    expect(found.founders.every((f) => f.anonymised)).toBe(true);
    setMockSessionUserId(null);
  });
});
