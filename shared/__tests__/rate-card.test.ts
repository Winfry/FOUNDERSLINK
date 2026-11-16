import { describe, expect, it } from 'vitest';
import { freeFirst, priceFor, priceWords, rankExperts, rateCardProblem, rateLine, readBudget, readQuestion, type RateItem } from '../expert-question';

const card: RateItem[] = [
  { service: 'First consultation (30 minutes)', area: 'land_property', unit: 'free', price_kes: null },
  { service: 'Land search and title report', area: 'land_property', unit: 'fixed', price_kes: 8000 },
  { service: 'Lease review', area: 'land_property', unit: 'fixed', price_kes: 15000 },
  { service: 'Contract review', area: 'contracts', unit: 'hour', price_kes: 3000 },
];

describe('rate cards in words', () => {
  it('says each price plainly', () => {
    expect(priceWords(card[0]!)).toBe('Free');
    expect(priceWords(card[1]!)).toBe('KES 8,000');
    expect(priceWords(card[3]!)).toBe('KES 3,000 an hour');
    expect(priceWords(card[3]!, 'sw')).toBe('KES 3,000 kwa saa');
    expect(rateLine(card[1]!)).toBe('Land search and title report: KES 8,000');
  });

  it('shows the price for her need: the cheapest item in that area, never a free one', () => {
    expect(priceFor(card, 'land_property')).toBe(card[1]);
    expect(priceFor(card, 'contracts')).toBe(card[3]);
    expect(priceFor(card, 'tax')).toBeNull();
    expect(priceFor(card)).toBe(card[3]);
    expect(priceFor(undefined, 'tax')).toBeNull();
    expect(freeFirst(card)).toBe(true);
  });

  it('checks a card before it is saved', () => {
    expect(rateCardProblem(card, ['land_property', 'contracts'])).toBeNull();
    expect(rateCardProblem(card, ['land_property'])).toBe('"Contract review" is not something your profession may offer.');
    expect(rateCardProblem([{ service: 'Advice', area: 'tax', unit: 'fixed', price_kes: 0 }], ['tax'])).toBe('Give "Advice" a price in KES, or mark it free.');
    expect(rateCardProblem([{ service: 'x', area: 'tax', unit: 'free', price_kes: null }], ['tax'])).toMatch(/Give each line a name/);
  });
});

describe('a budget in her words', () => {
  it('reads the usual ways of saying it', () => {
    expect(readBudget('Who can do a land search for under KES 10,000?')).toBe(10000);
    expect(readBudget('an accountant below 20k please')).toBe(20000);
    expect(readBudget('my budget is 15,000')).toBe(15000);
    expect(readBudget('something for 5000 or less')).toBe(5000);
    expect(readBudget('wakili wa ardhi chini ya elfu 10')).toBe(10000);
    expect(readBudget('bajeti yangu ni elfu 15')).toBeNull();
    expect(readBudget('bajeti ya elfu 15')).toBe(15000);
    expect(readBudget('wakili wa ardhi chini ya 10,000')).toBe(10000);
  });
  it('is not fooled by other numbers', () => {
    expect(readBudget('up to 5 people')).toBeNull();
    expect(readBudget('I want to invest KES 1M in a farm')).toBeNull();
    expect(readBudget('Which advocates know land law?')).toBeNull();
  });
});

describe('recommending within her budget', () => {
  const base = { profession: 'lawyer', sectors: ['agri'], counties: [], register_checked: true, office_hours: { left_this_month: 2 }, helped: 1 };
  const cheap = { ...base, name: 'cheap', practice_areas: ['land_property'], rate_card: [{ service: 'Land search and title report', area: 'land_property', unit: 'fixed' as const, price_kes: 8000 }] };
  const dear = { ...base, name: 'dear', helped: 20, practice_areas: ['land_property'], rate_card: [{ service: 'Land search and title report', area: 'land_property', unit: 'fixed' as const, price_kes: 18000 }] };
  const noCard = { ...base, name: 'nocard', helped: 30, practice_areas: ['land_property'] };

  it('puts the expert within budget first, and says why', () => {
    const q = readQuestion('Who can do a land search for a farm for under KES 10,000?');
    expect(q.budgetKes).toBe(10000);
    const ranked = rankExperts([dear, noCard, cheap], q);
    expect(ranked[0]!.expert.name).toBe('cheap');
    expect(ranked[0]!.reasons).toContain('Land search and title report: KES 8,000, within your budget');
    // Above budget is said plainly, not hidden.
    expect(ranked.find((r) => r.expert.name === 'dear')!.reasons).toContain('Land search and title report: KES 18,000, above your budget');
  });

  it('without a budget, price changes nothing', () => {
    const q = readQuestion('Who can do a land search for a farm?');
    expect(rankExperts([cheap, dear], q).map((r) => r.expert.name)).toEqual(['dear', 'cheap']);
  });
});
