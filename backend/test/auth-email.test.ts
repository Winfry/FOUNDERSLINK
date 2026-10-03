import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Email verification at sign-up and password reset by code. No email is
// sent in tests, so the code is read from the response the way a
// developer would. Runs against DATABASE_URL and removes what it creates.

const run = Date.now();
const email = `mail-${run}@example.com`;
const password = "correct-horse-battery";
const newPassword = "a-brand-new-password";
let base = "";
let server: ReturnType<typeof app.listen>;
let token = "";
let code = "";

async function call(method: string, path: string, body?: unknown, auth?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const other = (c: string) => (c === "000000" ? "111111" : "000000");

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
  server.close();
});

test("signing up sends a code to the address, and the account starts unverified", async () => {
  const res = await call("POST", "/auth/register", { email, password, full_name: "Amina Founder" });
  token = res.json.token;
  code = res.json.email_verification.dev_code;

  // No email provider in tests, so the code comes back for development.
  assert.equal(res.json.email_verification.email, "not_configured");
  assert.match(code, /^\d{6}$/);
  assert.equal((await call("GET", "/me", undefined, token)).json.email_verified_at, null);
  // Only a hash of the code is stored.
  const stored = await prisma.emailCode.findFirstOrThrow({ where: { user: { email } } });
  assert.notEqual(stored.code_hash, code);
});

test("she cannot apply for vetting until the address is verified", async () => {
  await call("PATCH", "/vetting/application", { phone: "0712000099", statement: "I run a clinic booking app in Nairobi." }, token);
  const refused = await call("POST", "/vetting/application/submit", undefined, token);
  assert.equal(refused.json.error.code, "EMAIL_NOT_VERIFIED");
});

test("a wrong code is refused, the right one verifies, and it works once", async () => {
  assert.equal((await call("POST", "/auth/email/verify", { code: other(code) }, token)).json.error.code, "WRONG_CODE");
  assert.equal((await call("POST", "/auth/email/verify", { code: "12" }, token)).status, 400);

  assert.deepEqual((await call("POST", "/auth/email/verify", { code }, token)).json, { email_verified: true });
  assert.ok((await call("GET", "/me", undefined, token)).json.email_verified_at);

  // Used up: there is no code waiting any more.
  assert.equal((await call("POST", "/auth/email/verify", { code }, token)).json.error.code, "CODE_EXPIRED");
  assert.equal((await call("POST", "/auth/email/code", undefined, token)).json.error.code, "ALREADY_VERIFIED");
  assert.equal((await call("POST", "/vetting/application/submit", undefined, token)).status, 200);
});

test("asking to reset a password gives the same answer for any address", async () => {
  const known = await call("POST", "/auth/password/forgot", { email });
  const unknown = await call("POST", "/auth/password/forgot", { email: `nobody-${run}@example.com` });

  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.equal(known.json.message, unknown.json.message);
  // Outside production both answers carry a code, so they look alike.
  // The one for an address with no account is made up and never works.
  assert.deepEqual(Object.keys(known.json).sort(), Object.keys(unknown.json).sort());
  assert.match(unknown.json.dev_code, /^\d{6}$/);
  const decoy = await call("POST", "/auth/password/reset", { email: `nobody-${run}@example.com`, code: unknown.json.dev_code, new_password: newPassword });
  assert.equal(decoy.json.error.code, "WRONG_CODE");
  code = known.json.dev_code;
});

test("a new password needs the right code, and replaces the old one", async () => {
  const wrong = await call("POST", "/auth/password/reset", { email, code: other(code), new_password: newPassword });
  const nobody = await call("POST", "/auth/password/reset", { email: `nobody-${run}@example.com`, code, new_password: newPassword });
  assert.equal(wrong.json.error.code, "WRONG_CODE");
  // An unknown address gets the same answer as a wrong code.
  assert.deepEqual(wrong.json, nobody.json);
  assert.equal((await call("POST", "/auth/password/reset", { email, code, new_password: "short" })).status, 400);

  assert.deepEqual((await call("POST", "/auth/password/reset", { email, code, new_password: newPassword })).json, { password_reset: true });

  assert.equal((await call("POST", "/auth/login", { email, password })).status, 401);
  assert.equal((await call("POST", "/auth/login", { email, password: newPassword })).status, 200);
  // The code cannot be used a second time.
  assert.equal((await call("POST", "/auth/password/reset", { email, code, new_password: password })).json.error.code, "WRONG_CODE");
});

test("five wrong codes stop further tries, with the same answer the phone and 2FA checks give", async () => {
  const again = `mail2-${run}@example.com`;
  const res = await call("POST", "/auth/register", { email: again, password, full_name: "Second Founder" });
  const bad = other(res.json.email_verification.dev_code);
  for (let i = 0; i < 5; i++) await call("POST", "/auth/email/verify", { code: bad }, res.json.token);

  const locked = await call("POST", "/auth/email/verify", { code: res.json.email_verification.dev_code }, res.json.token);
  assert.equal(locked.status, 429);
  assert.equal(locked.json.error.code, "TOO_MANY_ATTEMPTS");
  await prisma.user.deleteMany({ where: { email: again } });
});
