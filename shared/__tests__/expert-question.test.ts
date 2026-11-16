import { describe, expect, it } from 'vitest';
import { explain, fitOf, rankExperts, readQuestion } from '../expert-question';

const COUNTIES = ['Nairobi', 'Nakuru', 'Kisumu', 'Uasin Gishu'];

describe('reading a question', () => {
  it('an investor new to farming who asks about land law gets a land lawyer for agriculture', () => {
    const q = readQuestion(
      'I would love to invest in a founder in agriculture but I do not know the laws. I want advocates who know land law.',
      COUNTIES,
    );
    expect(q).toEqual({ profession: 'lawyer', practiceArea: 'land_property', sector: 'agri', county: undefined });
    expect(explain(q)).toMatch(/land is often the biggest risk/);
  });

  it('farming alone points to land, the first thing to check', () => {
    expect(readQuestion('I want to invest in a dairy farm in Nakuru', COUNTIES)).toMatchObject({
      practiceArea: 'land_property',
      sector: 'agri',
      county: 'Nakuru',
    });
  });

  it('understands Kiswahili', () => {
    expect(readQuestion('Nahitaji wakili wa ardhi kwa shamba langu', COUNTIES)).toMatchObject({
      profession: 'lawyer',
      practiceArea: 'land_property',
      sector: 'agri',
    });
  });

  it('a named profession wins: an accountant for a farm stays an accountant', () => {
    expect(readQuestion('I need an accountant to check the books of a poultry business', COUNTIES)).toMatchObject({
      profession: 'accountant',
      practiceArea: 'bookkeeping',
      sector: 'agri',
    });
  });

  it('tax goes to accountants', () => {
    expect(readQuestion('Who can help with KRA and VAT?', COUNTIES)).toMatchObject({ profession: 'accountant', practiceArea: 'tax' });
  });

  it('says so when it cannot tell', () => {
    const q = readQuestion('hello', COUNTIES);
    expect(q.practiceArea).toBeUndefined();
    expect(explain(q)).toMatch(/could not tell/);
  });
});

describe('ranking experts', () => {
  const base = { register_checked: true, office_hours: { left_this_month: 2 }, helped: 1, counties: [] as string[] };
  const land = { ...base, name: 'land', profession: 'lawyer', practice_areas: ['land_property'], sectors: ['agri'] };
  const company = { ...base, name: 'company', profession: 'lawyer', practice_areas: ['company'], sectors: ['health'], helped: 9 };
  const accountant = { ...base, name: 'acc', profession: 'accountant', practice_areas: ['tax'], sectors: ['agri'] };

  it('the land lawyer for agriculture comes first, and only lawyers are offered', () => {
    const q = readQuestion('advocate for land law in agriculture', COUNTIES);
    const ranked = rankExperts([company, accountant, land], q);
    expect(ranked.map((r) => r.expert.name)).toEqual(['land', 'company']);
    expect(ranked[0]!.reasons).toEqual(['Land and property law', 'Works with agriculture businesses', 'LSK register checked']);
  });

  it('someone with no sessions left this month comes after someone who has', () => {
    const full = { ...land, name: 'full', office_hours: { left_this_month: 0 } };
    const q = readQuestion('land law for a farm', COUNTIES);
    expect(rankExperts([full, land], q).map((r) => r.expert.name)).toEqual(['land', 'full']);
  });

  it('an expert who lists no counties covers all of them', () => {
    expect(fitOf(land, { county: 'Kisumu' }).reasons).toContain('Works in Kisumu');
  });
});
