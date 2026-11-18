import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { MAX_FAILURES, MAX_FAILURES_PER_ADDRESS, WINDOW_MS, checkLoginAllowed, recordLoginFailure, resetLoginLimits } from "../src/modules/auth/login-limit.js";
import { prisma } from "../src/shared/db.js";

// Signing in is paused after too many wrong passwords, and every response
// carries the standard security headers.

const email = `limit-${Date.now()}@example.com`;
const password = "correct-horse-battery";
let base = "";
let server: ReturnType<typeof app.listen>;
let userId = "";

const login = (pw: string, who = email) =>
  fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: who, password: pw }) });

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const user = await prisma.user.create({ data: { email, full_name: "Limit Test", role: "founder", password_hash: await bcrypt.hash(password, 4) } });
  userId = user.id;
  resetLoginLimits();
});

after(async () => {
  resetLoginLimits();
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
  server.close();
});

test("too many wrong passwords pause signing in, even with the right one", async () => {
  for (let i = 0; i < MAX_FAILURES; i++) assert.equal((await login("wrong-password-1")).status, 401);
  const paused = await login(password);
  assert.equal(paused.status, 429);
  assert.equal(((await paused.json()) as any).error.code, "TOO_MANY_ATTEMPTS");
  resetLoginLimits();
  assert.equal((await login(password)).status, 200);
});

test("a correct sign-in clears the account's count", async () => {
  for (let i = 0; i < MAX_FAILURES - 1; i++) await login("wrong-password-1");
  assert.equal((await login(password)).status, 200);
  assert.equal((await login("wrong-password-1")).status, 401);
  assert.equal((await login(password)).status, 200);
  resetLoginLimits();
});

test("the pause ends after the window", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES; i++) recordLoginFailure("x@example.com", "9.9.9.9", t0);
  // That email is paused from anywhere...
  assert.throws(() => checkLoginAllowed("x@example.com", "1.1.1.1", t0 + 1000), /Too many wrong attempts/);
  // ...but someone else on the same shared address is not.
  assert.doesNotThrow(() => checkLoginAllowed("other@example.com", "9.9.9.9", t0 + 1000));
  // And it ends after the window.
  assert.doesNotThrow(() => checkLoginAllowed("x@example.com", "1.1.1.1", t0 + WINDOW_MS + 1));
  resetLoginLimits();
});

test("one address guessing across many emails is paused at the looser limit", () => {
  const t0 = 2_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_ADDRESS; i++) recordLoginFailure(`user${i}@example.com`, "8.8.8.8", t0);
  assert.throws(() => checkLoginAllowed("someone-new@example.com", "8.8.8.8", t0 + 1000), /Too many wrong attempts/);
  assert.doesNotThrow(() => checkLoginAllowed("someone-new@example.com", "7.7.7.7", t0 + 1000));
  resetLoginLimits();
});

test("responses carry the standard security headers", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.ok(res.headers.get("content-security-policy"));
  assert.ok(res.headers.get("strict-transport-security"));
  assert.equal(res.headers.get("x-powered-by"), null);
});
