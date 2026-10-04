// Sending an SMS, through Bonga SMS or Africa's Talking, whichever has
// its settings filled in (Bonga first). With neither set, nothing is
// sent and the caller is told so.
//
// NOTE: both are written from the providers' published request formats
// and checked only against a fake server in the tests. Neither has been
// run against the real service from here, so treat the first real send
// as the test.

import { env } from "../config/env.js";

export type SmsResult = { status: "sent" } | { status: "not_configured" } | { status: "failed"; error: string };

const failed = (err: unknown): SmsResult => ({ status: "failed", error: err instanceof Error ? err.message : String(err) });

// Bonga takes the number without its plus sign, and answers 200 even
// when it refuses: the refusal is `status: 666` in the body.
async function sendWithBonga(to: string, message: string): Promise<SmsResult> {
  try {
    const res = await fetch(env.BONGA_SEND_SMS_URL!, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        apiClientID: env.BONGA_CLIENT_ID!,
        key: env.BONGA_API_KEY!,
        secret: env.BONGA_SECRET!,
        txtMessage: message,
        MSISDN: to.replace(/^\+/, ""),
        serviceID: env.BONGA_SERVICE_ID!,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: "failed", error: `SMS provider answered ${res.status}` };
    const answer = (await res.json().catch(() => null)) as { status?: number; status_message?: string } | null;
    if (answer?.status === 666) return { status: "failed", error: answer.status_message ?? "The SMS provider refused the message" };
    return { status: "sent" };
  } catch (err) {
    return failed(err);
  }
}

async function sendWithAfricasTalking(to: string, message: string): Promise<SmsResult> {
  try {
    const res = await fetch(env.SMS_API_URL, {
      method: "POST",
      headers: {
        apiKey: env.SMS_PROVIDER_API_KEY!,
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ username: env.SMS_PROVIDER_USERNAME!, to, message }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: "failed", error: `SMS provider answered ${res.status}` };
    return { status: "sent" };
  } catch (err) {
    return failed(err);
  }
}

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const bonga = env.BONGA_CLIENT_ID && env.BONGA_API_KEY && env.BONGA_SECRET && env.BONGA_SERVICE_ID && env.BONGA_SEND_SMS_URL;
  if (bonga) return sendWithBonga(to, message);
  if (env.SMS_PROVIDER_API_KEY && env.SMS_PROVIDER_USERNAME) return sendWithAfricasTalking(to, message);
  return { status: "not_configured" };
}
