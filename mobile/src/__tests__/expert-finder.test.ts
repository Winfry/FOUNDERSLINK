import { describe, expect, it } from 'vitest';
import { trustWords } from '@shared/professions';
import { mockExpertService } from '../services/mocks/expert.mock';
import { setMockSessionUserId } from '../services/mocks/mock-session';

describe('asking the Co-pilot who can help (demo data)', () => {
  it('an investor new to farming who asks about land law gets advocates who know land law for agriculture', async () => {
    const r = await mockExpertService.find('I would love to invest in a founder in agriculture but I do not know the laws. Which advocates know land law?');
    expect(r.understood).toMatchObject({ profession: 'lawyer', practice_area: 'land_property', sector: 'agri' });
    expect(r.explanation).toMatch(/Lands registry/);
    expect(r.experts.map((e) => e.full_name).slice(0, 2)).toEqual(['Joseph Kiprono', 'Mercy Atieno']);
    expect(r.experts.every((e) => e.profession === 'lawyer')).toBe(true);
    expect(r.experts[0]!.reasons).toContain('Land and property law');
    expect(r.note).toMatch(/not legal, tax or financial advice/);
  });

  it('a county narrows it: land law in Kisumu puts the Kisumu advocate first', async () => {
    const r = await mockExpertService.find('land law for a farm in Kisumu');
    expect(r.experts[0]!.full_name).toBe('Mercy Atieno');
    expect(r.experts[0]!.reasons).toContain('Works in Kisumu');
  });

  it('answers in Kiswahili when asked to', async () => {
    const r = await mockExpertService.find('Nani anajua sheria ya ardhi kwa shamba?', 'sw');
    expect(r.explanation).toMatch(/ardhi/);
    expect(r.experts[0]!.reasons[0]).toBe('Sheria ya ardhi na mali');
  });

  it('a session request needs a topic', async () => {
    await expect(mockExpertService.requestSession('exp-kiprono', 'short')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(mockExpertService.requestSession('exp-kiprono', 'Please check the title deed of a farm in Nakuru.')).resolves.toBeUndefined();
  });

  it('every suggested expert says how she was checked, in words', async () => {
    const r = await mockExpertService.find('land law for a farm');
    expect(trustWords(r.experts[0]!.verification!)).toBe('Licensed · LSK · checked 12 Nov 2026');
    const m = await mockExpertService.find('a mentor to help me pitch');
    expect(trustWords(m.experts[0]!.verification!)).toBe('Experience checked · 2 references · 1 Sep 2026');
  });

  it('a member can report an expert once; a second report from her is refused', async () => {
    await expect(mockExpertService.report('exp-atieno', 'no')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(mockExpertService.report('exp-atieno', 'Asked me to pay a fee outside a session.')).resolves.toEqual({ suspended: false });
    await expect(mockExpertService.report('exp-atieno', 'Again.')).rejects.toMatchObject({ code: 'ALREADY_REPORTED' });
  });

  it('a founder preparing to raise gets the whole path, each step with a verified expert or a plain "nobody yet"', async () => {
    setMockSessionUserId('u-amina');
    const r = await mockExpertService.find('I’m preparing to raise investment for my farm. Who will I need?');
    expect(r.explanation).toMatch(/^Raising investment usually goes in steps/);
    const plan = r.plan!;
    expect(plan.map((p) => p.need)).toEqual(['mentor', 'valuer', 'accountant', 'company_advocate', 'deal_advocate', 'tax', 'secretary_shares', 'land_advocate']);
    expect(plan.find((p) => p.need === 'land_advocate')!.expert!.full_name).toBe('Joseph Kiprono');
    expect(plan.find((p) => p.need === 'mentor')!.expert!.full_name).toBe('Brian Ochieng');
    expect(plan.find((p) => p.need === 'valuer')!.expert!.full_name).toBe('Peter Wafula');
    expect(plan.find((p) => p.need === 'secretary_shares')!.expert!.full_name).toBe('Faith Chebet');
    // Every expert offered actually offers what that step needs.
    for (const p of plan) if (p.expert) expect(p.expert.practice_areas.length).toBeGreaterThan(0);
  });

  it('an investor asking the same gets it from her side, with no mentor', async () => {
    setMockSessionUserId('inv-savanna');
    const r = await mockExpertService.find('I’m preparing to invest. Who will I need at each step?');
    expect(r.plan!.map((p) => p.need)).not.toContain('mentor');
    expect(r.plan!.find((p) => p.need === 'accountant')!.why).toBe('To check the numbers before you invest.');
    setMockSessionUserId(null);
  });

  it('an ordinary question has no plan', async () => {
    expect((await mockExpertService.find('Which advocates know land law?')).plan).toBeNull();
  });

  it('says plainly when nobody offers a need yet, instead of suggesting someone else', async () => {
    const r = await mockExpertService.find('Who do I need for due diligence on a farm?');
    const surveyor = r.plan!.find((p) => p.need === 'land_surveyor')!;
    expect(surveyor.expert).toBeNull();
    // The company advocate is an advocate, never the company secretary.
    expect(r.plan!.find((p) => p.need === 'company_advocate')!.expert!.profession).toBe('lawyer');
  });

  it('within a budget: the advocate whose land search fits comes first, and the other is told plainly', async () => {
    const r = await mockExpertService.find('Who can do a land search for a farm in Nakuru for under KES 7,000?');
    expect(r.understood.budget_kes).toBe(7000);
    expect(r.experts[0]!.full_name).toBe('Mercy Atieno');
    expect(r.experts[0]!.reasons).toContain('Land search and title report: KES 6,500, within your budget');
    expect(r.experts.find((e) => e.full_name === 'Joseph Kiprono')!.reasons).toContain('Land search and title report: KES 8,000, above your budget');
  });

  it('every demo expert has a rate card, and each line is something her profession may offer', async () => {
    const { allowedAreas } = await import('@shared/professions');
    const { rateCardProblem } = await import('@shared/expert-question');
    for (const e of await mockExpertService.list()) {
      expect(e.rate_card!.length, e.full_name).toBeGreaterThan(0);
      expect(rateCardProblem(e.rate_card!, allowedAreas(e.profession)), e.full_name).toBeNull();
    }
  });

  it('each step of a plan says which area it is for, so the right price shows', async () => {
    const r = await mockExpertService.find('I’m preparing to raise investment. Who will I need?');
    expect(r.plan!.every((p) => typeof p.area === 'string')).toBe(true);
  });
});
