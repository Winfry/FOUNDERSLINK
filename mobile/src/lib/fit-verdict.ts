import type { MatchBand } from '../types';

export interface FitGap {
  kind?: string;
  /** The HTTP service sends `title`, the mock `text`. */
  title?: string;
  text?: string;
}

// What an investor's page says at the top. A funder in "Fix first" fits
// only once the gap is closed, so the page says that, not just the band
// (FINAL_VERIFICATION 13: it said "Good fit, 6 of 6" with no gap shown).
// `meta` is the band's own words (bandMeta in components/matches/parts).
export function fitVerdict(
  band: MatchBand,
  meta: { label: string; verdict: string },
  gaps: FitGap[],
  reasons: { fits: boolean }[],
) {
  const named = gaps.filter((g) => g.title ?? g.text);
  const fixFirst = named.length > 0 && band !== 'not_a_fit';
  const toFix = named.length === 1 ? '1 thing' : `${named.length} things`;
  const fits = reasons.filter((r) => r.fits).length;
  return {
    fixFirst,
    gaps: named.map((g) => ({ kind: g.kind, text: (g.title ?? g.text)! })),
    label: fixFirst ? `${meta.label}, once you fix ${toFix}` : meta.label,
    text: fixFirst ? 'Sort out what is below before you pitch. Until then they are likely to say no.' : meta.verdict,
    count:
      reasons.length > 0
        ? `${fits} of ${reasons.length} things they look for match${fixFirst ? `, and ${toFix} to fix first` : ''}`
        : null,
    answerOnly: named.every((g) => g.kind === 'unanswered'),
  };
}
