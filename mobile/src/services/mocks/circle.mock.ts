import type { CircleService } from '../types/api';
import type { CircleDetail } from '../../types';
import { mockDelay } from './delay';
import { openChamaChat } from './conversation.mock';
import { getMemberById } from './mock-store';
import { getMockSessionUserId } from './mock-session';

const DISCLAIMER = 'FoundersLink records contributions. It never holds or moves your money.';

const circles: CircleDetail[] = [
  {
    id: 'circle-1',
    name: 'Nairobi Health Founders Chama',
    type: 'money' as const,
    myRole: 'organiser' as const,
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
      memberName: c.members.find((m) => m.userId === payload.memberUserId)?.name ?? payload.memberUserId,
      amountKes: payload.amountKes,
      goalLabel: payload.goalId ? 'Goal' : 'General',
      recordedAt: new Date().toISOString(),
      reference: payload.mpesaReceipt ?? '',
    };
    c.contributions.push(row);
    return row;
  },

  async create(payload) {
    await mockDelay();
    const uid = getMockSessionUserId();
    const me = uid ? getMemberById(uid) : null;
    const c = {
      id: `circle-${Date.now()}`,
      name: payload.name,
      type: payload.type,
      myRole: 'organiser' as const,
      memberCount: 1,
      paybillNumber: null,
      unreadChatCount: 0,
      // The person who starts it is its organiser.
      members: [{ userId: me?.user.id ?? 'u-amina', name: me?.user.fullName ?? 'Amina Wanjiru', role: 'organiser' as const, joinedAt: new Date().toISOString() }],
      contributions: [],
      owes: [],
      goals: [],
      moneyDisclaimer: payload.type === 'money' ? DISCLAIMER : '',
    };
    circles.push(c);
    // As on the backend, the chama gets its group chat when it is created.
    openChamaChat(c.id, c.name, c.members[0]!.name);
    return c;
  },
};
