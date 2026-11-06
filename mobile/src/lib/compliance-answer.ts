import type { ComplianceAskAnswer } from '../types';

// How an Ask Compliance answer is shown (TEAM_DECISIONS D3):
// - answered: written from official sources, every fact cited.
// - quoted:   no written answer, but the closest official passage, word for
//             word, with its source. Not "no source": there is one.
// - no_source: nothing official covers it, so nothing is guessed.
export type AnswerKind = 'answered' | 'quoted' | 'no_source';

export function answerKind(answer: ComplianceAskAnswer): AnswerKind {
  if (!answer.cannotConfirm) return 'answered';
  return answer.citations?.length ? 'quoted' : 'no_source';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Checked 4 Oct 2026": when FoundersLink last checked the source. Nothing
// when the date is missing or unreadable.
export function checkedOn(date: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '');
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return null;
  return `Checked ${Number(m[3])} ${month} ${m[1]}`;
}
