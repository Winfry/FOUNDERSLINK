/**
 * The one place the app talks to the FounderLink backend.
 *
 * Set EXPO_PUBLIC_API_URL (e.g. http://192.168.1.20:8000) to use the
 * backend. Without it the app runs on the mocks. On a phone, the
 * address must be the laptop's address on the Wi-Fi, never "localhost".
 */
import * as SecureStore from '../../lib/secure-storage';
import type { ApiError } from '../../types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

// The same key the auth store saves the session under.
const SESSION_KEY = 'founderlink_session_v2';

// Kept in memory once known. After a restart it is read back from the
// saved session, so the auth store does not need to hand it over.
let token: string | null = null;

export function setToken(next: string | null) {
  token = next;
}

async function currentToken() {
  if (token) return token;
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    token = raw ? (JSON.parse(raw).tokens?.accessToken ?? null) : null;
  } catch {
    token = null;
  }
  return token;
}

/** The signed-in user's id, from the saved session. */
export async function currentUserId(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw).user?.id ?? null) : null;
  } catch {
    return null;
  }
}

type Body = Record<string, unknown> | FormData | undefined;

/**
 * Calls the backend and returns its JSON. A failure is thrown as
 * `{ code, message }`, the same shape the mocks throw, so screens need
 * no change. `code` is the backend's own (e.g. APPROVAL_REQUIRED).
 */
export async function api<T>(method: string, path: string, body?: Body): Promise<T> {
  const bearer = await currentToken();
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        // For a file upload the browser or device sets this itself.
        ...(body && !isForm ? { 'content-type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw { code: 'NETWORK_ERROR', message: 'Cannot reach FounderLink. Check your connection and try again.' } satisfies ApiError;
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const error: ApiError = {
      code: json?.error?.code ?? 'UNKNOWN_ERROR',
      message: json?.error?.message ?? 'Something went wrong. Try again.',
    };
    throw error;
  }
  return json as T;
}

export const get = <T>(path: string) => api<T>('GET', path);
export const post = <T>(path: string, body?: Body) => api<T>('POST', path, body);
export const patch = <T>(path: string, body?: Body) => api<T>('PATCH', path, body);
export const put = <T>(path: string, body?: Body) => api<T>('PUT', path, body);
export const del = <T>(path: string) => api<T>('DELETE', path);
