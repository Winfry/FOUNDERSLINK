import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./config";
import { parseSession, type AdminSession } from "./types";

export type { AdminSession } from "./types";

export async function getServerSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const session = parseSession(raw);
  if (!session?.mfaVerified) return null;
  return session;
}
