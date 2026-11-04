// Confirms a phone number on an account the way the app does: save it on
// the account, ask for a code, type the code in. Without an SMS provider
// the backend hands the code back (see test/setup.ts).
import assert from "node:assert/strict";

export async function confirmPhone(base: string, token: string, phone: string) {
  const send = (method: string, path: string, body?: unknown) =>
    fetch(base + path, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(async (res) => ({ status: res.status, json: (await res.json()) as any }));

  const saved = await send("PATCH", "/me", { phone });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  const code = (await send("POST", "/me/phone/code")).json.dev_code;
  const verified = await send("POST", "/me/phone/verify", { code });
  assert.equal(verified.status, 200, JSON.stringify(verified.json));
  return saved.json.phone as string;
}

// A number for this test run, so runs never collide on the unique phone.
export const runPhone = (run: number, n: number) => `07${String(run).slice(-7)}${n}`;
