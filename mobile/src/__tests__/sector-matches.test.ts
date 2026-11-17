import { describe, expect, it } from 'vitest';
import { matchesFor } from '../services/mocks/demo-investors';
import type { FounderProfile } from '../types';

const founder = (over: Partial<FounderProfile>): FounderProfile => ({
  businessName: 'Test',
  sector: 'health',
  stage: 'mvp',
  county: 'Nairobi',
  description: 'A business.',
  fundingAmountKes: 1_000_000,
  journeyType: 'startup',
  businessStatus: 'registered_business_name',
  instruments: ['equity'],
  hasEmployees: false,
  handlesPersonalData: false,
  alreadyHave: [],
  profileCompleteness: 40,
  ...over,
});

const fitting = (m: ReturnType<typeof matchesFor>) => [...m.applyNow, ...m.applyAfter];

describe('the demo matches a new founder on her own business', () => {
  it('an agriculture founder in Nakuru sees agriculture investors, not health ones', () => {
    const m = matchesFor(founder({ sector: 'agri', county: 'Nakuru', fundingAmountKes: 2_000_000 }));
    expect(m.applyNow.length).toBeGreaterThan(0);
    for (const c of fitting(m)) expect(c.displayName).toMatch(/Agriculture|Any sector/);
    expect(fitting(m).some((c) => c.displayName.includes('Health'))).toBe(false);
    expect(m.applyNow[0]!.reasons.some((r) => r.text === 'Invests in agriculture')).toBe(true);
  });

  it('a fintech founder sees fintech investors', () => {
    const m = matchesFor(founder({ sector: 'fintech', stage: 'early_revenue', fundingAmountKes: 1_000_000 }));
    expect(m.applyNow.length).toBeGreaterThan(0);
    for (const c of fitting(m)) expect(c.displayName).toMatch(/Fintech|Any sector/);
  });

  it('names stay hidden until she is verified', () => {
    const m = matchesFor(founder({ sector: 'agri', county: 'Nakuru', fundingAmountKes: 2_000_000 }));
    for (const c of [...m.applyNow, ...m.applyAfter, ...m.notForYou]) expect(c.anonymised).toBe(true);
  });

  it('says why an investor is not a fit, in plain words', () => {
    const m = matchesFor(founder({ sector: 'agri', county: 'Nakuru', fundingAmountKes: 2_000_000 }));
    expect(m.notForYou.length).toBeGreaterThan(0);
    for (const c of m.notForYou) expect(c.reasons[0]!.fits).toBe(false);
    // What the design page shows for this founder.
    expect(m.notForYou.map((c) => c.reasons[0]!.text)).toEqual([
      'Funds health and fintech businesses only',
      'Funds health businesses only',
      'Funds health and climate businesses only',
      'Funds fintech businesses only',
    ]);
    expect(m.applyNow.map((c) => [c.ticket, c.reasons[0]!.text])).toEqual([
      ['KES 500k to KES 2M', 'Backs early businesses around Nairobi and Nakuru'],
      ['KES 1M to KES 10M', 'Funds farming and food businesses only'],
      ['KES 250k to KES 2.5M', 'Backs farms and cooperatives outside Nairobi'],
    ]);
    expect(m.applyAfter.map((c) => [c.ticket, c.gaps[0]!.text])).toEqual([['KES 500k to KES 2.5M', 'CR12']]);
  });

  it('an investor waiting for a paper is "after a fix", and ready once she has it', () => {
    const without = matchesFor(founder({ sector: 'climate', fundingAmountKes: 1_000_000, alreadyHave: [] }));
    expect(without.applyAfter.some((c) => c.gaps[0]?.complianceItemId === 'brs')).toBe(true);
    const withBrs = matchesFor(founder({ sector: 'climate', fundingAmountKes: 1_000_000, alreadyHave: ['brs'] }));
    expect(withBrs.applyAfter.some((c) => c.gaps[0]?.complianceItemId === 'brs')).toBe(false);
  });

  it('the amount she asks for counts', () => {
    const big = matchesFor(founder({ sector: 'agri', county: 'Nakuru', stage: 'growth', fundingAmountKes: 50_000_000 }));
    expect(big.applyNow.every((c) => c.displayName.includes('Any sector'))).toBe(true);
  });
});

describe('saving her profile builds her list', () => {
  it('a new agriculture founder gets agriculture investors; Amina keeps her named list', async () => {
    const { mockAuthService } = await import('../services/mocks/auth.mock');
    const { mockFounderService } = await import('../services/mocks/founder-profile.mock');
    const { mockConsentService } = await import('../services/mocks/consent.mock');
    const { mockFundingService } = await import('../services/mocks/funding.mock');
    const { setMockSessionUserId } = await import('../services/mocks/mock-session');

    const { user } = await mockAuthService.signup({ fullName: 'Kamande Otieno', email: `kamande-${Math.random().toString(36).slice(2)}@new.demo`, password: 'NewPass2026!x', role: 'founder', acceptTerms: true } as never);
    setMockSessionUserId(user.id);
    await mockFounderService.saveProfile(founder({ sector: 'agri', county: 'Nakuru', fundingAmountKes: 2_000_000, alreadyHave: ['kra_pin'] }));
    await mockConsentService.set('ai_matching', true);
    const m = await mockFundingService.getMatches();
    expect(m.applyNow.length).toBeGreaterThan(0);
    expect(fitting(m).some((c) => c.displayName.includes('Health'))).toBe(false);

    setMockSessionUserId('u-amina');
    const amina = await mockFundingService.getMatches();
    expect(amina.applyNow[0]!.displayName).toBe('David Otieno');
    setMockSessionUserId(null);
  });
});
