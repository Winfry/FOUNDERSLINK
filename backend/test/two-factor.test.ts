import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";
import { base32Encode, codeAt, otpauthUrl, verifyCode } from "../src/shared/totp.js";

// Authenticator-app codes, and the two-step sign-in for admins.

test("codes match the published test values for the standard (RFC 6238)", () => {
  // The standard's own test secret and times, with the expected codes
  // cut to six digits.
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(secret, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.equal(codeAt(secret, 59_000), "287082");
  assert.equal(codeAt(secret, 1_111_111_109_000), "081804");
  assert.equal(codeAt(secret, 1_234_567_890_000), "005924");
});

test("a code is accepted for its own half-minute and the ones either side", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  const now = 1_111_111_109_000;
  assert.equal(verifyCode(secret, "081804", now), true);
  assert.equal(verifyCode(secret, "081804", now + 30_000), true);
  assert.equal(verifyCode(secret, "081804", now + 90_000), false);
  assert.equal(verifyCode(secret, "000000", now), false);
  assert.match(otpauthUrl("admin@example.com", secret), /^otpauth:\/\/totp\/FounderLink%3Aadmin%40example\.com\?secret=GEZD/);
});

const run = Date.now();
const password = "correct-horse-battery";
const emails = { admin: `2fa-admin-${run}@example.com`, founder: `2fa-founder-${run}@example.com` };
let base = "";
let server: ReturnType<typeof app.listen>;
let secret = "";

async function call(method: string, path: string, body?: unknown, auth?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const login = (email: string) => call("POST", "/auth/login", { email, password });
const wrong = (code: string) => (code === "000000" ? "111111" : "000000");

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  await prisma.user.create({ data: { email: emails.admin, full_name: "Test Admin", role: "admin", approval_status: "approved", password_hash } });
  await prisma.user.create({ data: { email: emails.founder, full_name: "Test Founder", role: "founder", password_hash } });
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  await prisma.$disconnect();
  server.close();
});

test("an admin sets up two-step sign-in by proving her app shows the right code", async () => {
  const founder = (await login(emails.founder)).json.token;
  assert.equal((await call("POST", "/auth/2fa/setup", undefined, founder)).status, 403);

  const token = (await login(emails.admin)).json.token;
  assert.equal((await call("POST", "/auth/2fa/enable", { code: "123456" }, token)).json.error.code, "SETUP_FIRST");

  const started = await call("POST", "/auth/2fa/setup", undefined, token);
  secret = started.json.secret;
  assert.match(started.json.otpauth_url, /^otpauth:\/\/totp\//);

  const now = codeAt(secret, Date.now());
  assert.equal((await call("POST", "/auth/2fa/enable", { code: wrong(now) }, token)).json.error.code, "WRONG_CODE");
  // Not on yet: a wrong code changes nothing.
  assert.ok((await login(emails.admin)).json.token);

  const enabled = await call("POST", "/auth/2fa/enable", { code: now }, token);
  assert.equal(enabled.json.two_factor_enabled, true);
  assert.equal((await call("POST", "/auth/2fa/setup", undefined, token)).json.error.code, "ALREADY_ENABLED");
});

test("her password alone no longer signs her in", async () => {
  const first = await login(emails.admin);
  assert.equal(first.json.two_factor_required, true);
  assert.equal(first.json.token, undefined);

  // The token she holds between the two steps opens nothing.
  const pending = first.json.pending_token;
  assert.equal((await call("GET", "/me", undefined, pending)).status, 401);
  assert.equal((await call("GET", "/admin/vetting/queue", undefined, pending)).status, 401);
});

test("the code from her app completes the sign-in", async () => {
  const pending = (await login(emails.admin)).json.pending_token;
  const code = codeAt(secret, Date.now());

  assert.equal((await call("POST", "/auth/2fa/verify", { pending_token: pending, code: wrong(code) })).json.error.code, "WRONG_CODE");
  assert.equal((await call("POST", "/auth/2fa/verify", { pending_token: "not-a-real-token", code })).status, 401);

  const done = await call("POST", "/auth/2fa/verify", { pending_token: pending, code });
  assert.equal(done.status, 200);
  assert.equal(done.json.user.role, "admin");
  assert.equal((await call("GET", "/admin/vetting/queue", undefined, done.json.token)).status, 200);

  // A full session token cannot be used as the half-way token.
  assert.equal((await call("POST", "/auth/2fa/verify", { pending_token: done.json.token, code })).status, 401);
});

test("five wrong codes stop further tries for a while", async () => {
  const pending = (await login(emails.admin)).json.pending_token;
  const bad = wrong(codeAt(secret, Date.now()));
  // A correct code clears the count, so this starts from zero.
  for (let i = 0; i < 5; i++) await call("POST", "/auth/2fa/verify", { pending_token: pending, code: bad });

  const locked = await call("POST", "/auth/2fa/verify", { pending_token: pending, code: codeAt(secret, Date.now()) });
  assert.equal(locked.status, 429);
  assert.equal(locked.json.error.code, "TOO_MANY_ATTEMPTS");
});
