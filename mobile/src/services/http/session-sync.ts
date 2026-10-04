import type { SessionUser } from '../../types';

/**
 * The app keeps a copy of the signed-in user from the moment she logged
 * in. Things change on the server after that: an admin approves her, or
 * she confirms her phone. Whenever an answer from the backend carries a
 * newer fact, it is written into the saved session here, so every screen
 * that reads the session sees it without her signing in again.
 *
 * The store is loaded on first use, because the store itself imports
 * the services.
 */
export async function syncSessionUser(patch: Partial<SessionUser>) {
  const { useAuthStore } = await import('../../stores/authStore');
  // Right after the app opens, a screen can ask the backend before the
  // saved session has been read back. Wait for it.
  if (!useAuthStore.getState().hydrated) await useAuthStore.getState().hydrate();
  const { user, patchUser } = useAuthStore.getState();
  if (!user) return;
  const changed = (Object.keys(patch) as (keyof SessionUser)[]).some((key) => patch[key] !== undefined && patch[key] !== user[key]);
  if (changed) await patchUser(patch);
}
