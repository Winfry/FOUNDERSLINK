import type { ConnectionService } from '../types/api';
import type { ConnectionJoinRequest } from '../../types';
import { mockDelay } from './delay';

const seedRequests: ConnectionJoinRequest[] = [
  {
    id: 'conn-1',
    direction: 'received',
    status: 'pending',
    withUserId: 'inv-savanna',
    withFullName: 'Savanna Angels',
    withOrganisationName: 'Savanna Angels',
    focusAreas: ['Health', 'MVP'],
    pitch: 'We like ClinicBook and can open hospital partnerships.',
    vision: 'Scale to 3 counties in 18 months.',
    offer: 'Board observer + introductions to insurers.',
    proposedAmountKes: 1_000_000,
    createdAt: new Date().toISOString(),
  },
];

export const mockConnectionService: ConnectionService = {
  async list() {
    await mockDelay();
    return seedRequests;
  },

  async request(userId, message) {
    await mockDelay();
    seedRequests.push({
      id: `conn-${Date.now()}`,
      direction: 'sent',
      status: 'pending',
      withUserId: userId,
      withFullName: 'Investor',
      focusAreas: [],
      pitch: message ?? '',
      vision: '',
      offer: '',
      proposedAmountKes: 0,
      createdAt: new Date().toISOString(),
    });
  },

  async respond(id, accept, reason) {
    await mockDelay();
    const req = seedRequests.find((r) => r.id === id);
    if (!req) throw { code: 'NOT_FOUND', message: 'Join request not found.' };
    req.status = accept ? 'accepted' : 'declined';
    if (!accept && reason) req.declineReason = reason;
    return { connectionId: `connection-${id}`, proposedAmountKes: accept ? req.proposedAmountKes : undefined };
  },

  async withdraw(id) {
    await mockDelay();
    const idx = seedRequests.findIndex((r) => r.id === id);
    if (idx >= 0) seedRequests.splice(idx, 1);
  },
};
