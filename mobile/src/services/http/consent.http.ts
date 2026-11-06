import type { ConsentService } from '../types/api';
import { consentWording } from '../../lib/consents';
import { get, post } from './client';

// The wording is the app's (lib/consents). Whether each is granted comes from the backend.
export const httpConsentService: ConsentService = {
  async list(role) {
    const granted = await get<{ purpose: string; granted: boolean }[]>('/me/consents');
    return consentWording(role).map((m) => ({ ...m, granted: granted.find((g) => g.purpose === m.purpose)?.granted ?? false }));
  },

  async set(purpose, granted) {
    await post('/me/consents', { purpose, granted });
  },
};
