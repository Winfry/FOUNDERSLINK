import type { CircleService } from '../types/api';
import type { CircleContribution, CircleDetail, CircleRole, CircleSummary } from '../../types';
import { get, post } from './client';

/** One row of `GET /circles`. */
interface ApiCircleRow {
  id: string;
  name: string;
  type: 'money' | 'learning';
  my_role: CircleRole;
  members: number;
  registration_status: string;
}

/** `GET /circles/:id`, and the answer to `POST /circles`. */
interface ApiCircle {
  id: string;
  name: string;
  type: 'money' | 'learning';
  my_role: CircleRole;
  paybill_number: string | null;
  contribution: { amount_kes: number; frequency: 'weekly' | 'monthly' } | null;
  total_contributed_kes: number;
  members: {
    user_id: string;
    full_name: string;
    role: CircleRole;
    contributed_kes: number;
    this_period: { paid_kes: number; due_kes: number } | null;
  }[];
  goals: { id: string; title: string; target_amount_kes: number | null; raised_kes: number }[];
  notice: string | null;
}

/** One row of `GET /circles/:id/contributions`. */
interface ApiContribution {
  id: string;
  member: { id: string; full_name: string } | null;
  amount_kes: number;
  paid_at: string;
  goal: { id: string; title: string } | null;
  mpesa_receipt: string | null;
}

function toContribution(p: ApiContribution): CircleContribution {
  return {
    id: p.id,
    memberName: p.member?.full_name ?? '',
    amountKes: p.amount_kes,
    goalLabel: p.goal?.title,
    recordedAt: p.paid_at,
    reference: p.mpesa_receipt ?? undefined,
  };
}

function toDetail(c: ApiCircle, contributions: ApiContribution[]): CircleDetail {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    myRole: c.my_role,
    memberCount: c.members.length,
    paybillNumber: c.paybill_number,
    // Unread counts are in the conversations, not in the circle.
    unreadChatCount: 0,
    members: c.members.map((m) => ({
      userId: m.user_id,
      name: m.full_name,
      role: m.role,
      // The backend does not say when a member joined.
      joinedAt: '',
    })),
    contributions: contributions.map(toContribution),
    // Who has not yet paid this week's or month's amount in full. Empty
    // when the circle has no set contribution.
    owes: c.members
      .filter((m) => m.this_period && m.this_period.due_kes > 0)
      .map((m) => ({ memberName: m.full_name, amountKes: m.this_period!.due_kes })),
    goals: c.goals.map((g) => ({ id: g.id, label: g.title, targetKes: g.target_amount_kes ?? 0, recordedKes: g.raised_kes })),
    // The backend's own words. A learning circle has no money and no notice.
    moneyDisclaimer: c.notice ?? '',
  };
}

export const httpCircleService: CircleService = {
  async list() {
    const rows = await get<ApiCircleRow[]>('/circles');
    return rows.map(
      (r): CircleSummary => ({
        id: r.id,
        name: r.name,
        type: r.type,
        myRole: r.my_role,
        memberCount: r.members,
        // The list does not carry the Paybill; the circle itself does.
        paybillNumber: null,
        unreadChatCount: 0,
      }),
    );
  },

  async get(circleId) {
    const [circle, contributions] = await Promise.all([
      get<ApiCircle>(`/circles/${circleId}`),
      get<ApiContribution[]>(`/circles/${circleId}/contributions`),
    ]);
    return toDetail(circle, contributions);
  },

  // Records a payment a member already made to the circle's own account.
  // The backend refuses anyone but the organiser or treasurer.
  async recordContribution(circleId, payload) {
    const saved = await post<{ id: string; amount_kes: number; paid_at: string; mpesa_receipt: string | null }>(
      `/circles/${circleId}/contributions`,
      {
        member_id: payload.memberUserId,
        amount_kes: payload.amountKes,
        // The screen has no date field: the payment is recorded as made now.
        paid_at: new Date().toISOString(),
        goal_id: payload.goalId,
        mpesa_receipt: payload.mpesaReceipt || undefined,
      },
    );
    // The answer has the member's id and not her name, so read it back.
    const all = await get<ApiContribution[]>(`/circles/${circleId}/contributions`);
    const row = all.find((p) => p.id === saved.id);
    return row
      ? toContribution(row)
      : { id: saved.id, memberName: '', amountKes: saved.amount_kes, recordedAt: saved.paid_at, reference: saved.mpesa_receipt ?? undefined };
  },

  // The creator becomes the circle's organiser.
  async create(payload) {
    const circle = await post<ApiCircle>('/circles', { name: payload.name, type: payload.type });
    return toDetail(circle, []);
  },
};
