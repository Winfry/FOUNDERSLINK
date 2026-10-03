// Sending an SMS through Africa's Talking. With no credentials set,
// nothing is sent and the caller is told so.
//
// NOTE: written from the provider's published API and checked only
// against a fake server in the tests. It has not been run against the
// real sandbox, so treat the first real send as the test.

import { env } from "../config/env.js";

export type SmsResult = { status: "sent" } | { status: "not_configured" } | { status: "failed"; error: string };

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!env.SMS_PROVIDER_API_KEY || !env.SMS_PROVIDER_USERNAME) return { status: "not_configured" };

  try {
    const res = await fetch(env.SMS_API_URL, {
      method: "POST",
      headers: {
        apiKey: env.SMS_PROVIDER_API_KEY,
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ username: env.SMS_PROVIDER_USERNAME, to, message }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: "failed", error: `SMS provider answered ${res.status}` };
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
