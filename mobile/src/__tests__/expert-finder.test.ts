import { describe, expect, it } from 'vitest';
import { mockExpertService } from '../services/mocks/expert.mock';

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
});
