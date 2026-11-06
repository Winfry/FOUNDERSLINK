import type { ConsentService } from '../types/api';
import { consentWording } from '../../lib/consents';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

export const mockConsentService: ConsentService = {
  async list(role) {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    const grants = member?.consents ?? {};
    return consentWording(role).map((m) => ({ ...m, granted: grants[m.purpose] ?? false }));
  },

  async set(purpose, granted) {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (!member) throw { code: 'PROFILE_REQUIRED', message: 'Sign in first.' };
    member.consents[purpose] = granted;
    upsertMember(member);
  },
};
