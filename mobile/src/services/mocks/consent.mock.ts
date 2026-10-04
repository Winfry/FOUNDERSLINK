import type { ConsentService } from '../types/api';
import type { ConsentRecord } from '../../types';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

const META: Omit<ConsentRecord, 'granted'>[] = [
  {
    purpose: 'profile_visibility',
    label: 'Profile visibility',
    description: 'Let verified investors and members see my profile.',
  },
  {
    purpose: 'ai_matching',
    label: 'Matching',
    description: 'Use my business details to match me with investors.',
  },
  {
    purpose: 'contact',
    label: 'Contact',
    description: 'Contact me by SMS or WhatsApp.',
  },
];

export const mockConsentService: ConsentService = {
  async list() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    const grants = member?.consents ?? { profile_visibility: false, ai_matching: false, contact: false };
    return META.map((m) => ({ ...m, granted: grants[m.purpose] }));
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
