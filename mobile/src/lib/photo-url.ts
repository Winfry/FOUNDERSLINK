import { API_URL } from '../services/http/client';

/**
 * A photo address from the backend ("/media/photos/<token>") as one the app
 * can load. Addresses that are already whole (a picked file, a demo photo)
 * are kept as they are.
 */
export function photoUri(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('/') ? `${API_URL}${path}` : path;
}
