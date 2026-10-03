import type { GroupService } from '../types/api';
import { mockDelay } from './delay';

export const mockGroupService: GroupService = {
  async listGroups() {
    await mockDelay();
    return [
      {
        id: 'g1',
        name: 'Maziwa Fresh Co. — Round A',
        founderId: 'f1',
        balanceKes: 4_250_000,
        targetKes: 8_500_000,
        memberCount: 4,
        unreadChatCount: 3,
        lastMessagePreview: 'Deposit confirmed via M-Pesa',
      },
    ];
  },
  async getGroup(groupId) {
    await mockDelay();
    return {
      id: groupId,
      name: 'Maziwa Fresh Co. — Round A',
      founderId: 'f1',
      balanceKes: 4_250_000,
      targetKes: 8_500_000,
      memberCount: 4,
      unreadChatCount: 0,
      recentActivity: [
        'M-Pesa paybill 303030 linked to group escrow',
        'James Kariuki joined after founder approval',
        'James Kariuki deposited KES 500,000 (MPESA-QK4H2)',
        'Amina Hassan deposited KES 250,000 via STK push',
        'KRA PIN certificate verified',
      ],
    };
  },
  async getMembers() {
    await mockDelay();
    return [
      { id: 'm1', name: 'Wanjiku Mwangi', role: 'founder', joinedAt: '2025-06-01', contributionKes: 975_000 },
      { id: 'm2', name: 'James Kariuki', role: 'investor', joinedAt: '2025-08-12', contributionKes: 1_500_000 },
      { id: 'm3', name: 'Amina Hassan', role: 'investor', joinedAt: '2025-09-03', contributionKes: 1_000_000 },
      { id: 'm4', name: 'David Otieno', role: 'investor', joinedAt: '2025-10-01', contributionKes: 775_000 },
    ];
  },
  async removeMember() {
    await mockDelay();
  },
  async getTransactions() {
    await mockDelay();
    return [
      {
        id: 't1',
        type: 'deposit',
        amountKes: 500_000,
        memberName: 'James Kariuki',
        reference: 'MPESA-QK4H2',
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 't2',
        type: 'deposit',
        amountKes: 250_000,
        memberName: 'Amina Hassan',
        reference: 'MPESA-PL9K1',
        status: 'completed',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        id: 't3',
        type: 'deposit',
        amountKes: 775_000,
        memberName: 'David Otieno',
        reference: 'MPESA-RT2M8',
        status: 'completed',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ];
  },
  async deposit(_groupId, amountKes) {
    await mockDelay(700);
    return {
      id: 't-new',
      type: 'deposit',
      amountKes,
      memberName: 'You',
      reference: 'MPESA-PENDING',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  },
  async submitWithdrawal(_groupId, payload) {
    await mockDelay();
    return {
      id: 'w1',
      groupId: 'g1',
      requesterName: 'Wanjiku Mwangi',
      requesterEmail: 'wanjiku@maziwafresh.co.ke',
      amountKes: Number(payload.amountKes ?? 200_000),
      reason: String(payload.reason ?? ''),
      status: 'pending_approvals',
      approvals: [
        { approverId: 'm2', approverName: 'James Kariuki', status: 'pending' },
        { approverId: 'm3', approverName: 'Amina Hassan', status: 'pending' },
        { approverId: 'm4', approverName: 'David Otieno', status: 'pending' },
      ],
    };
  },
  async getWithdrawal(_groupId, withdrawalId) {
    await mockDelay();
    return {
      id: withdrawalId,
      groupId: 'g1',
      requesterName: 'Wanjiku Mwangi',
      requesterEmail: 'wanjiku@maziwafresh.co.ke',
      amountKes: 200_000,
      reason: 'Supplier payment — cooling equipment',
      status: 'pending_approvals',
      approvals: [
        { approverId: 'm2', approverName: 'James Kariuki', status: 'approved' },
        { approverId: 'm3', approverName: 'Amina Hassan', status: 'pending' },
        { approverId: 'm4', approverName: 'David Otieno', status: 'pending' },
      ],
    };
  },
  async approveWithdrawal() {
    await mockDelay();
  },
  async getDocuments() {
    await mockDelay();
    return [
      { id: 'gd1', type: 'brs', label: 'BRS Certificate', status: 'verified' },
      { id: 'gd2', type: 'bank', label: 'Absa Bank Statement — Sep 2025', status: 'verified' },
    ];
  },
};
