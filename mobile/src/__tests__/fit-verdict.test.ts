import { describe, expect, it } from 'vitest';
import { fitVerdict } from '../lib/fit-verdict';

const good = { label: 'Good fit', verdict: 'Worth pitching. You match what they fund.' };
const sixFits = Array.from({ length: 6 }, () => ({ fits: true }));

describe("an investor's page in Fix first", () => {
  it('says what is left to fix, not just the band (FINAL_VERIFICATION 13)', () => {
    const v = fitVerdict('good', good, [{ kind: 'requirement', title: 'KRA PIN certificate' }], sixFits);
    expect(v.fixFirst).toBe(true);
    expect(v.label).toBe('Good fit, once you fix 1 thing');
    expect(v.text).not.toMatch(/Worth pitching/);
    expect(v.count).toBe('6 of 6 things they look for match, and 1 thing to fix first');
    expect(v.gaps).toEqual([{ kind: 'requirement', text: 'KRA PIN certificate' }]);
    expect(v.answerOnly).toBe(false);
  });

  it('reads the mock service too, and counts more than one gap', () => {
    const v = fitVerdict('good', good, [{ kind: 'unanswered', text: 'Is it women-owned?' }, { kind: 'unanswered', text: 'Is it youth-owned?' }], []);
    expect(v.label).toBe('Good fit, once you fix 2 things');
    expect(v.count).toBeNull();
    expect(v.answerOnly).toBe(true);
  });

  it('says only the band when nothing is left to fix, or the funder is ruled out', () => {
    expect(fitVerdict('good', good, [], sixFits)).toMatchObject({ fixFirst: false, label: 'Good fit', text: good.verdict });
    const ruledOut = fitVerdict('not_a_fit', { label: 'Not a fit', verdict: 'Not for you.' }, [{ title: 'A gap' }], []);
    expect(ruledOut.fixFirst).toBe(false);
  });
});
