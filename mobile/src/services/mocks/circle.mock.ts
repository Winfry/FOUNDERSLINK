import type { CircleService } from '../types/api';
import { mockDelay } from './delay';

const DISCLAIMER = 'FounderLink records contributions. It never holds or moves your money.';

const circles = [
  {
    id: 'circle-1',
    name: 'Nairobi Health Founders Chama',
    type: 'money' as const,
    memberCount: 3,
    paybillNumber: '303030',
    unreadChatCount: 1,
    members: [
      { userId: 'u-amina', name: 'Amina Wanjiru', role: 'organiser' as const, joinedAt: '2025-06-01' },
      { userId: 'u-2', name: 'James Kariuki', role: 'treasurer' as const, joinedAt: '2025-07-01' },
      { userId: 'u-3', name: 'Grace Mwangi', role: 'member' as const, joinedAt: '2025-08-15' },
    ],
    contributions: [
      {
        id: 'c1',
        memberName: 'Amina Wanjiru',
        amountKes: 50_000,
        goalLabel: 'Legal fees pool',
        recordedAt: new Date(Date.now() - 86400000).toISOString(),
        reference: 'MPESA-QK4H2',
      },
    ],
    owes: [{ memberName: 'Grace Mwangi', amountKes: 25_000 }],
    goals: [{ id: 'g1', label: 'Legal fees pool', targetKes: 150_000, recordedKes: 100_000 }],
    moneyDisclaimer: DISCLAIMER,
  },
];

export const mockCircleService: CircleService = {
  async list() {
    await mockDelay();
    return circles.map(({ members, contributions, owes, goals, moneyDisclaimer, ...s }) => s);
  },

  async get(circleId) {
    await mockDelay();
    const c = circles.find((x) => x.id === circleId);
    if (!c) throw { code: 'NOT_FOUND', message: 'Chama not found.' };
    return c;
  },

  async recordContribution(circleId, payload) {
    await mockDelay();
    const c = circles.find((x) => x.id === circleId);
    if (!c) throw { code: 'NOT_FOUND', message: 'Chama not found.' };
    const row = {
      id: `c-${Date.now()}`,
      memberName: payload.memberUserId,
      amountKes: payload.amountKes,
      goalLabel: payload.goalId ? 'Goal' : 'General',
      recordedAt: new Date().toISOString(),
      reference: 'MPESA-NEW',
    };
    c.contributions.push(row);
    return row;
  },
};
