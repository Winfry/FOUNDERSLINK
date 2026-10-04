import type { ConsentService } from '../types/api';
import type { ConsentRecord } from '../../types';
import { get, post } from './client';

// The wording is the app's. Whether each is granted comes from the backend.
const META: Omit<ConsentRecord, 'granted'>[] = [
  { purpose: 'profile_visibility', label: 'Profile visibility', description: 'Let verified investors and members see my profile.' },
  { purpose: 'ai_matching', label: 'Matching', description: 'Use my business details to match me with investors.' },
  { purpose: 'contact', label: 'Contact', description: 'Contact me by SMS or WhatsApp.' },
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
