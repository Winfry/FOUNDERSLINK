import type { Deal, DealMilestone } from '../types';

/**
 * How a closed investment is doing, worked out from what the deal records:
 * its agreed goals (milestones) and the check-ins due 30, 90 and 180 days
 * after closing. FoundersLink records deals, never money, so this is about
 * the business, not a balance.
 */

export const isInvestment = (d: Deal) => d.stage === 'closed' || d.stage === 'active';

export type Health = 'onTrack' | 'well' | 'call';
export const HEALTH: Record<Health, { label: string; tone: 'done' | 'waiting' }> = {
  well: { label: 'Going well', tone: 'done' },
  onTrack: { label: 'On track', tone: 'done' },
  call: { label: 'Worth a call', tone: 'waiting' },
};

export const isLate = (m: DealMilestone, now = new Date()) =>
  m.status !== 'done' && m.dueDate !== null && new Date(m.dueDate).getTime() < now.getTime();

export function healthOf(deal: Deal, now = new Date()): { health: Health; line: string } {
  const goals = deal.milestones ?? [];
  const late = goals.find((m) => isLate(m, now));
  const done = goals.filter((m) => m.status === 'done').length;
  if (late) return { health: 'call', line: `A goal is late: ${late.title}.` };
  if (goals.length && done === goals.length) return { health: 'well', line: `Every goal met: ${done} of ${goals.length}.` };
  if (goals.length) return { health: 'onTrack', line: `${done} of ${goals.length} goals met so far.` };
  return { health: 'onTrack', line: 'No goals recorded yet. Agree them in the deal room.' };
}

export interface CheckIn {
  days: 30 | 90 | 180;
  date: Date;
  state: 'passed' | 'next' | 'planned';
}

/** The check-ins after closing: the first one still ahead is "next". */
export function checkInsOf(deal: Deal, now = new Date()): CheckIn[] {
  if (!deal.closedAt) return [];
  const closed = new Date(deal.closedAt).getTime();
  let nextFound = false;
  return ([30, 90, 180] as const).map((days) => {
    const date = new Date(closed + days * 86400000);
    if (date.getTime() < now.getTime()) return { days, date, state: 'passed' as const };
    const state = nextFound ? ('planned' as const) : ('next' as const);
    nextFound = true;
    return { days, date, state };
  });
}

export const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const INSTRUMENT: Record<string, string> = {
  equity: 'Equity',
  convertible_note: 'Convertible note',
  safe: 'SAFE',
  revenue_share: 'Revenue share',
  debt: 'Loan',
  grant: 'Grant',
};

export function termsLine(deal: Deal) {
  const kind = INSTRUMENT[deal.terms.instrument] ?? 'Investment';
  const share = deal.terms.equityPercent ? `, ${deal.terms.equityPercent}%` : '';
  const when = deal.closedAt ? ` · closed ${longDate(deal.closedAt)}` : '';
  return `${kind}${share}${when}`;
}
