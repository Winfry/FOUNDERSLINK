/**
 * Account settings that live on the backend: her language, how she is
 * told about things, and deleting her account.
 */
import { API_URL, currentToken, patch, post } from './client';
import type { ApiError } from '../../types';

export interface AccountPreferences {
  preferred_language?: 'en' | 'sw';
  notification_channel?: 'in_app' | 'sms';
}

/** Saves one or both preferences on her account. */
export const updatePreferences = (body: AccountPreferences) => patch<unknown>('/me', { ...body });

/**
 * Deletes her account. The backend refuses a wrong password with a 401
 * and a message the screen shows. The shared `api` helper treats every
 * 401 as an ended session and signs her out, which is wrong here, so
 * this one call is made directly.
 */
export async function deleteAccount(password: string, reason?: string): Promise<void> {
  const bearer = await currentToken();
  let res: Response;
  try {
    res = await fetch(API_URL + '/me', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify(reason ? { password, reason } : { password }),
    });
  } catch {
    throw { code: 'NETWORK_ERROR', message: 'Cannot reach FoundersLink. Check your connection and try again.' } satisfies ApiError;
  }
  if (res.ok) return;
  const json = await res.json().catch(() => null);
  throw {
    code: json?.error?.code ?? 'UNKNOWN_ERROR',
    message: json?.error?.message ?? 'Could not delete your account. Try again.',
  } satisfies ApiError;
}

/** Tells FoundersLink's staff about a member. It appears on their Reports page. */
export async function reportMember(userId: string, reason: string): Promise<void> {
  await post('/reports', { user_id: userId, reason });
}
