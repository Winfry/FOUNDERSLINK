import type { ConnectionService } from '../types/api';
import type { ConnectionJoinRequest } from '../../types';
import { del, get, patch, post } from './client';

/** One row of `GET /connections`. */
interface ApiConnection {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  direction: 'sent' | 'received';
  with: { id: string; full_name: string; organisation_name: string | null; focus_areas: string[] };
  message: string | null;
  pitch: string | null;
  vision: string | null;
  offer: string | null;
  proposed_amount_kes: number | null;
  decline_reason: string | null;
  created_at: string;
}

function toRequest(c: ApiConnection): ConnectionJoinRequest {
  return {
    id: c.id,
    direction: c.direction,
    status: c.status as ConnectionJoinRequest['status'],
    withUserId: c.with.id,
    withFullName: c.with.full_name,
    withOrganisationName: c.with.organisation_name ?? undefined,
    focusAreas: c.with.focus_areas,
    // A plain request has a message and no pitch.
    pitch: c.pitch ?? c.message ?? '',
    vision: c.vision ?? '',
    offer: c.offer ?? '',
    proposedAmountKes: c.proposed_amount_kes ?? 0,
    createdAt: c.created_at,
    declineReason: c.decline_reason ?? undefined,
  };
}

export const httpConnectionService: ConnectionService = {
  async list() {
    const rows = await get<ApiConnection[]>('/connections');
    // A request that was taken back is gone, as far as the screen goes.
    return rows.filter((c) => c.status !== 'withdrawn').map(toRequest);
  },

  async request(userId, message) {
    await post('/connections', { user_id: userId, message: message || undefined });
  },

  // Accepting creates a connection and nothing else (D13). The screen
  // then offers to open a deal with the amount the investor proposed.
  async respond(id, accept, reason) {
    const before = accept ? (await get<ApiConnection[]>('/connections')).find((c) => c.id === id) : undefined;
    await patch(`/connections/${id}`, { status: accept ? 'accepted' : 'declined', reason: accept ? undefined : reason });
    return { connectionId: id, proposedAmountKes: before?.proposed_amount_kes ?? undefined };
  },

  async withdraw(id) {
    await del(`/connections/${id}`);
  },
};
