import type { ConsentService } from '../types/api';
import type { ConsentPurpose, ConsentRecord } from '../../types';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

const META: Omit<ConsentRecord, 'granted'>[] = [
  {
    purpose: 'profile_visibility',
    label: 'Let verified members see my profile',
    description: 'Without this you appear in nobody’s matches and your profile cannot be opened.',
  },
  {
    purpose: 'ai_matching',
    label: 'Use my details for AI matching',
    description: 'Without this FoundersLink’s own rules match you, and your description is not sent to the AI service.',
  },
  {
    purpose: 'contact',
    label: 'Contact me by SMS or WhatsApp',
    description: 'FoundersLink can reach you on your phone about your matches and deals.',
  },
  {
    // Asked in Settings only; see SettingsConsentPurpose in the types.
    purpose: 'document_processing' as ConsentPurpose,
    label: 'Let an AI model read documents I share in a deal',
    description: 'Without this they are checked by a person only.',
  },
];

export const mockConsentService: ConsentService = {
  async list() {
    await mockDelay();
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    const grants = member?.consents ?? { profile_visibility: false, ai_matching: false, contact: false };
    return META.map((m) => ({ ...m, granted: grants[m.purpose] ?? false }));
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
