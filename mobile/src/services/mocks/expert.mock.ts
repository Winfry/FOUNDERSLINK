import type { ExpertService } from '../http/expert.http';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

function me() {
  const uid = getMockSessionUserId();
  return uid ? getMemberById(uid) : undefined;
}

/** The expert's session requests on demo data. */
export const mockExpertService: ExpertService = {
  async listSessions() {
    await mockDelay();
    return me()?.sessions ?? [];
  },
  async answer(id, status) {
    await mockDelay();
    const member = me();
    if (!member) return;
    member.sessions = (member.sessions ?? []).map((s) => (s.id === id ? { ...s, status } : s));
    upsertMember(member);
  },
};
