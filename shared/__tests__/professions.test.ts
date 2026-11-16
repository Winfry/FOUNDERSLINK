import { describe, expect, it } from 'vitest';
import { allowedAreas, expertChecklist, nextRecheck, PROFESSIONS, professionById, regulatorOf, REGULATORS, requiredChecks } from '../professions';
import { PRACTICE, PRACTICE_AREAS, readQuestion } from '../expert-question';

const canOffer = (p: string, a: string) => allowedAreas(p).includes(a);

describe('the professions', () => {
  it('every licensed profession names a regulator that exists, and asks for its number and expiry', () => {
    for (const p of PROFESSIONS.filter((x) => x.trust === 'licensed')) {
      expect(regulatorOf(p), p.id).toBeDefined();
      expect(p.asks).toMatchObject({ registerNumber: true, expiry: true });
    }
    expect(regulatorOf(professionById('lawyer'))?.short).toBe('LSK');
    expect(regulatorOf(professionById('accountant'))?.short).toBe('ICPAK');
    expect(regulatorOf(professionById('architect'))).toBe(REGULATORS.boraqs);
  });

  it('every practice area is offered by someone, and every area a profession offers exists', () => {
    for (const a of PRACTICE_AREAS) expect(PROFESSIONS.some((p) => p.areas.includes(a)), a).toBe(true);
    for (const p of PROFESSIONS) for (const a of p.areas) expect(PRACTICE_AREAS as readonly string[], `${p.id}: ${a}`).toContain(a);
    // The profession each area points to by default may offer it.
    for (const a of PRACTICE_AREAS) expect(canOffer(PRACTICE[a].profession, a), a).toBe(true);
  });

  it('legal, tax and audit work is only for those licensed to do it', () => {
    const notLicensed = PROFESSIONS.filter((p) => p.trust !== 'licensed');
    for (const area of ['land_property', 'company', 'contracts', 'investment_deals', 'tax', 'audit']) {
      expect(notLicensed.filter((p) => p.areas.includes(area)).map((p) => p.id), area).toEqual([]);
    }
  });

  it('the checks needed before approval depend on the trust level', () => {
    expect(requiredChecks('lawyer')).toEqual(['identity', 'professional_register']);
    expect(requiredChecks('it_security')).toEqual(['identity', 'qualification']);
    expect(requiredChecks('mentor')).toEqual(['identity', 'reference']);
    // Someone whose profession is not known is checked like a mentor, never waved through.
    expect(requiredChecks('other')).toEqual(['identity', 'reference']);
  });
});

describe('the question reader knows the new professions', () => {
  it('a valuation goes to valuers', () => {
    expect(readQuestion('Who can do a valuation of the land and equipment?', [], canOffer)).toMatchObject({ practiceArea: 'valuation', profession: 'valuer' });
  });
  it('a named tax agent keeps the tax question', () => {
    expect(readQuestion('I need a tax agent for VAT', [], canOffer)).toMatchObject({ profession: 'tax_agent', practiceArea: 'tax' });
  });
  it('a company secretary for the share register', () => {
    expect(readQuestion('Who can update our share register after the investment?', [], canOffer)).toMatchObject({ practiceArea: 'governance', profession: 'company_secretary' });
  });
});

describe('the checklist before an expert is approved', () => {
  const now = new Date('2026-11-16T10:00:00Z');
  const pass = (check_type: string, checked_at = '2026-11-10') => ({ check_type, result: 'pass' as const, checked_at });
  const fail = (check_type: string, checked_at = '2026-11-12') => ({ check_type, result: 'fail' as const, checked_at });

  it('an advocate with nothing checked is not ready, and the register to use is named', () => {
    const c = expertChecklist({ profession: 'lawyer' }, [], now);
    expect(c.ready).toBe(false);
    expect(c.items.map((i) => [i.label, i.state])).toEqual([['Identity', 'missing'], ['LSK register', 'missing']]);
    expect(c.items[1]!.url).toBe('https://lsk.or.ke');
    expect(c.blocking).toBe('Still to check: Identity, LSK register.');
  });

  it('ready once identity and the register have passed, with a current licence', () => {
    const c = expertChecklist({ profession: 'lawyer', licence_expires_at: '2026-12-31' }, [pass('identity'), pass('professional_register')], now);
    expect(c).toMatchObject({ ready: true, expired: false, blocking: null, trustLabel: 'Licensed', regulator: { short: 'LSK' } });
  });

  it('the latest result counts: a register check that failed after passing blocks approval', () => {
    const c = expertChecklist({ profession: 'accountant' }, [pass('identity'), pass('professional_register', '2026-11-01'), fail('professional_register', '2026-11-15')], now);
    expect(c.ready).toBe(false);
    expect(c.blocking).toBe('Did not pass: ICPAK register.');
  });

  it('an expired licence blocks approval even with every check passed', () => {
    const c = expertChecklist({ profession: 'valuer', licence_expires_at: '2026-10-31' }, [pass('identity'), pass('professional_register')], now);
    expect(c).toMatchObject({ ready: false, expired: true });
  });

  it('a mentor needs two references, not one', () => {
    const one = expertChecklist({ profession: 'mentor' }, [pass('identity'), pass('reference')], now);
    expect(one.ready).toBe(false);
    expect(one.blocking).toBe('Still to check: Two references (1 of 2).');
    expect(expertChecklist({ profession: 'mentor' }, [pass('identity'), pass('reference'), pass('reference')], now).ready).toBe(true);
  });

  it('a certified expert is checked on her qualification, named', () => {
    const c = expertChecklist({ profession: 'it_security', qualification: 'CISA', qualification_body: 'ISACA' }, [], now);
    expect(c.items[1]).toMatchObject({ label: 'Qualification', how: 'Confirm "CISA" with ISACA, using their official contacts.' });
  });

  it('the next re-check is in a year, or on the licence expiry if sooner', () => {
    expect(nextRecheck('2026-12-31', now).toISOString().slice(0, 10)).toBe('2026-12-31');
    expect(nextRecheck(null, now).toISOString().slice(0, 10)).toBe('2027-11-16');
  });
});
