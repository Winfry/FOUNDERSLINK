// Sending an email through Resend. With no API key set, nothing is sent
// and the caller is told so.
//
// Until a sending domain is verified with Resend, it delivers only to
// the address that owns the Resend account. Other addresses fail.

import { env } from "../config/env.js";

export type EmailResult = { status: "sent" } | { status: "not_configured" } | { status: "failed"; error: string };

export async function sendEmail(to: string, subject: string, text: string): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) return { status: "not_configured" };

  try {
    const res = await fetch(env.EMAIL_API_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: "failed", error: `Email provider answered ${res.status}` };
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
