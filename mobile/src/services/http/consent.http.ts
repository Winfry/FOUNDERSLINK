import type { ConsentService } from '../types/api';
import type { ConsentPurpose, ConsentRecord } from '../../types';
import { get, post } from './client';

// The wording is the app's. Whether each is granted comes from the backend.
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

export const httpConsentService: ConsentService = {
  async list() {
    const granted = await get<{ purpose: string; granted: boolean }[]>('/me/consents');
    return META.map((m) => ({ ...m, granted: granted.find((g) => g.purpose === m.purpose)?.granted ?? false }));
  },

  async set(purpose, granted) {
    await post('/me/consents', { purpose, granted });
  },
};
