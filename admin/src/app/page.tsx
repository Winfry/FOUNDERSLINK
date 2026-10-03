import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PENDING_2FA_COOKIE, SESSION_COOKIE } from "@/lib/auth/config";
import { parseSession } from "@/lib/auth/types";

export default async function HomePage() {
  const jar = await cookies();
  const session = parseSession(jar.get(SESSION_COOKIE)?.value);
  const pending = jar.get(PENDING_2FA_COOKIE)?.value;

  if (session?.mfaVerified) redirect("/dashboard");
  if (pending) redirect("/verify-2fa");
  redirect("/login");
}
