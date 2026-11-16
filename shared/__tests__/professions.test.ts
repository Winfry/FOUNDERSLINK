import { describe, expect, it } from 'vitest';
import { allowedAreas, PROFESSIONS, professionById, regulatorOf, REGULATORS, requiredChecks } from '../professions';
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
