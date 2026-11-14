import { describe, expect, it } from 'vitest';
import { checkInsOf, healthOf, isInvestment } from '../lib/investments';
import { mockAuthService } from '../services/mocks/auth.mock';
import { mockDealService } from '../services/mocks/deal.mock';
import { setMockSessionUserId } from '../services/mocks/mock-session';
import { DEMO_PASSWORD } from '../services/mocks/mock-store';
import type { Deal } from '../types';

const base = (over: Partial<Deal>): Deal => ({
  id: 'd',
  type: 'investment',
  title: 'T',
  stage: 'active',
  withUserId: 'u',
  withName: 'Faith Achieng',
  terms: { amountKes: 1_000_000, instrument: 'equity' },
  confirmations: [],
  checklist: [],
  timeline: [],
  documents: [],
  ...over,
});

describe('My investments', () => {
  const now = new Date('2026-11-14T12:00:00Z');

  it('says how a business is doing from the goals both sides agreed', () => {
    const late = base({ milestones: [{ id: '1', title: 'Open in Nakuru', dueDate: '2026-09-30T00:00:00Z', status: 'pending' }] });
    expect(healthOf(late, now)).toEqual({ health: 'call', line: 'A goal is late: Open in Nakuru.' });

    const met = base({ milestones: [{ id: '1', title: 'A', dueDate: null, status: 'done' }, { id: '2', title: 'B', dueDate: null, status: 'done' }] });
    expect(healthOf(met, now).health).toBe('well');

    const going = base({ milestones: [{ id: '1', title: 'A', dueDate: '2027-01-01T00:00:00Z', status: 'pending' }] });
    expect(healthOf(going, now)).toEqual({ health: 'onTrack', line: '0 of 1 goals met so far.' });
  });

  it('plans check-ins 30, 90 and 180 days after closing, and marks the next one', () => {
    const deal = base({ closedAt: '2026-08-14T00:00:00Z' });
    expect(checkInsOf(deal, now).map((c) => [c.days, c.state])).toEqual([
      [30, 'passed'],
      [90, 'passed'],
      [180, 'next'],
    ]);
    expect(checkInsOf(base({ closedAt: null }), now)).toEqual([]);
  });

  it('the demo investor has two closed investments, and can choose to show one on her track record', async () => {
    const { user } = await mockAuthService.login({ email: 'grace@savanna.demo', password: DEMO_PASSWORD });
    setMockSessionUserId(user.id);
    const backed = (await mockDealService.list()).filter(isInvestment);
    expect(backed.map((d) => d.withName).sort()).toEqual(['Faith Achieng', 'Njeri Mwangi']);

    const pesa = backed.find((d) => d.withName === 'Faith Achieng')!;
    expect(pesa.sharesTrackRecord).toBe(false);
    expect(await mockDealService.setSharing(pesa.id, true)).toEqual({ youShare: true, shown: true });
    expect((await mockDealService.get(pesa.id)).sharesTrackRecord).toBe(true);
    setMockSessionUserId(null);
  });
});
