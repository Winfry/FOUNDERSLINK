export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  mfaVerified: boolean;
}

export function parseSession(raw: string | undefined): AdminSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.userId || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}
