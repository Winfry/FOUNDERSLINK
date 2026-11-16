import { describe, expect, it } from 'vitest';
import { journeyOf, matchNeeds, planIntro, SECTOR_NEEDS, STEP_NEEDS, whoYouMayNeed } from '../deal-experts';
import { PRACTICE_AREAS } from '../expert-question';
import { PROFESSIONS } from '../professions';

describe('who you may need at each step of a deal', () => {
  it('every need searches for a practice area that exists, and someone offers it', () => {
    const needs = [...Object.values(STEP_NEEDS).flat(), ...Object.values(SECTOR_NEEDS).flatMap((s) => Object.values(s).flat())];
    for (const n of needs) {
      expect(PRACTICE_AREAS as readonly string[], n.id).toContain(n.area);
      expect(PROFESSIONS.some((p) => p.areas.includes(n.area)), n.id).toBe(true);
    }
  });

  it('every need says why, from each side it is for', () => {
    for (const n of Object.values(STEP_NEEDS).flat()) {
      for (const side of ['founder', 'investor'] as const) {
        if (n.only && n.only !== side) continue;
        expect(n.why[side].length, `${n.id} ${side}`).toBeGreaterThan(20);
      }
    }
  });

  it('at due diligence: an accountant and an advocate, said from her side', () => {
    const f = whoYouMayNeed('due_diligence', { side: 'founder' });
    expect(f.map((n) => n.who)).toEqual(['An accountant or auditor', 'An advocate']);
    expect(f[0]!.why).toBe('To get your books and bank statements ready before the investor checks them.');
    const i = whoYouMayNeed('due_diligence', { side: 'investor' });
    expect(i[0]!.why).toBe('To check the numbers before you invest.');
  });

  it('a farm adds a land lawyer and a land surveyor at due diligence', () => {
    const n = whoYouMayNeed('due_diligence', { side: 'investor', sector: 'agri' });
    expect(n.map((x) => x.area)).toEqual(['audit', 'company', 'land_property', 'land_survey']);
    expect(n[2]!.why).toBe('To check who owns the land, how long the lease runs, and any loan on the title.');
  });

  it('a clinic adds data protection', () => {
    expect(whoYouMayNeed('due_diligence', { side: 'founder', sector: 'health' }).map((x) => x.area)).toContain('data_protection');
  });

  it('a mentor is only for the founder; a sector specialist only for the investor', () => {
    expect(whoYouMayNeed('exploring', { side: 'founder' }).map((n) => n.id)).toEqual(['valuer', 'mentor']);
    expect(whoYouMayNeed('exploring', { side: 'investor' }).map((n) => n.id)).toEqual(['valuer', 'sector_specialist']);
  });

  it('documents and after closing: the company secretary leads', () => {
    expect(whoYouMayNeed('documents_compliance', { side: 'founder' })[0]!.who).toBe('A company secretary');
    expect(whoYouMayNeed('active', { side: 'founder' }).map((n) => n.area)).toEqual(['governance', 'bookkeeping', 'insurance']);
  });

  it('preparing to raise: the whole path, in order, each with its step', () => {
    const plan = whoYouMayNeed('preparing', { side: 'founder', sector: 'agri' });
    expect(plan.map((n) => n.step)).toEqual(['Exploring', 'Exploring', 'Due diligence', 'Due diligence', 'Terms agreed', 'Terms agreed', 'Documents', 'Due diligence']);
    expect(plan.map((n) => n.id)).toEqual(['mentor', 'valuer', 'accountant', 'company_advocate', 'deal_advocate', 'tax', 'secretary_shares', 'land_advocate']);
  });
});

describe('a question that asks for the whole path', () => {
  it('knows when she is preparing to raise', () => {
    expect(journeyOf("I'm preparing to raise investment. Who will I need?")).toBe('preparing');
    expect(journeyOf('We are raising money for our dairy farm, who do we need?')).toBe('preparing');
    expect(journeyOf('Natafuta kutafuta wawekezaji, nahitaji nani?')).toBe('preparing');
    // The investor's side of the same question.
    expect(journeyOf('I’m preparing to invest. Who will I need at each step?')).toBe('preparing');
  });
  it('knows due diligence and closing', () => {
    expect(journeyOf('Who do I need for due diligence?')).toBe('due_diligence');
    expect(journeyOf('The investor has agreed. Who helps me close the deal?')).toBe('documents_compliance');
  });
  it('leaves an ordinary question alone', () => {
    expect(journeyOf('Which advocates know land law?')).toBeNull();
    expect(journeyOf('I want to invest in a farming business')).toBeNull();
  });
});

describe('the best verified expert for each need', () => {
  const ex = (user_id: string, practice_areas: string[], sectors: string[], left = 2, helped = 1) => ({ user_id, practice_areas, sectors, office_hours: { left_this_month: left }, helped });
  const land = ex('kiprono', ['land_property', 'contracts'], ['agri'], 2, 11);
  const company = ex('kamau', ['company', 'investment_deals'], ['health'], 1, 4);
  const allSectors = ex('otieno', ['company'], [], 3, 2);
  const auditor = ex('njambi', ['audit', 'bookkeeping'], [], 2, 5);

  it('picks someone who works in the sector first, then someone with a session free', () => {
    const plan = matchNeeds(whoYouMayNeed('due_diligence', { side: 'investor', sector: 'agri' }), [company, allSectors, land, auditor], 'agri');
    expect(plan.map((p) => [p.id, p.expert?.user_id ?? null])).toEqual([
      ['accountant', 'njambi'],
      ['company_advocate', 'otieno'],
      ['land_advocate', 'kiprono'],
      ['land_surveyor', null],
    ]);
  });

  it('says so when nobody offers a need yet, rather than suggesting the wrong person', () => {
    const [only] = matchNeeds(whoYouMayNeed('closed', { side: 'founder' }).slice(2), [land, company], null);
    expect(only).toMatchObject({ id: 'insurance', expert: null });
  });

  it('a different person for each need when there is one', () => {
    const plan = matchNeeds(whoYouMayNeed('due_diligence', { side: 'founder' }), [company, auditor, allSectors], null);
    expect(new Set(plan.map((p) => p.expert?.user_id)).size).toBe(plan.length);
  });

  it('the plan is introduced from her side', () => {
    expect(planIntro('preparing', 'founder')).toMatch(/^Raising investment usually goes in steps/);
    expect(planIntro('preparing', 'investor')).toMatch(/your checks \(due diligence\)/);
    expect(planIntro('due_diligence', 'founder')).toBe('At due diligence, these people often help. Not every deal needs each one.');
  });
});
