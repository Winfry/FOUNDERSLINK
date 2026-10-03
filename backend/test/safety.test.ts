import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Account settings, phone verification, who may ask to connect, contact
// details after connecting, and reporting a member. Runs against
// DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  amina: { role: "founder", full_name: "Amina Founder" },
  grace: { role: "investor", full_name: "Grace Investor" },
  achieng: { role: "founder", full_name: "Achieng Friend" },
  mumbi: { role: "founder", full_name: "Mumbi Friend" },
  admin: { role: "admin", full_name: "Test Admin" },
} as const;
type Who = keyof typeof people;
// Unique per run, since a phone number can be on one account only.
const phone = (n: number) => `07${String(run).slice(-7)}${n}`;

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};

async function call(method: string, path: string, who?: Who, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(who ? { authorization: `Bearer ${tokens[who]}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

async function verifyPhone(who: Who, number: string) {
  await call("PATCH", "/me", who, { phone: number });
  const sent = await call("POST", "/me/phone/code", who);
  return call("POST", "/me/phone/verify", who, { code: sent.json.dev_code });
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `safe-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, ...people[who], password_hash, approval_status: "approved" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
    await prisma.consent.create({ data: { user_id: user.id, purpose: "profile_visibility", granted: true, granted_at: new Date() } });
  }
});

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("a phone number is hers only after she types in the code sent to it", async () => {
  assert.equal((await call("PATCH", "/me", "amina", { phone: "12345" })).status, 400);

  const saved = await call("PATCH", "/me", "amina", { phone: phone(1), preferred_language: "sw" });
  assert.equal(saved.json.phone, `+254${phone(1).slice(1)}`);
  assert.equal(saved.json.phone_verified_at, null);
  assert.equal(saved.json.preferred_language, "sw");

  // SMS notifications need a verified number.
  assert.equal((await call("PATCH", "/me", "amina", { notification_channel: "sms" })).json.error.code, "PHONE_NOT_VERIFIED");

  const sent = await call("POST", "/me/phone/code", "amina");
  // No SMS provider is set up in tests, so the code is handed back for development.
  assert.equal(sent.json.sms, "not_configured");
  assert.match(sent.json.dev_code, /^\d{6}$/);

  const wrong = sent.json.dev_code === "000000" ? "111111" : "000000";
  assert.equal((await call("POST", "/me/phone/verify", "amina", { code: wrong })).json.error.code, "WRONG_CODE");

  const verified = await call("POST", "/me/phone/verify", "amina", { code: sent.json.dev_code });
  assert.ok(verified.json.phone_verified_at);
  assert.equal((await call("PATCH", "/me", "amina", { notification_channel: "sms" })).json.notification_channel, "sms");

  // The code is used up, and only its hash was ever stored.
  assert.equal((await call("POST", "/me/phone/verify", "amina", { code: sent.json.dev_code })).json.error.code, "CODE_EXPIRED");
});

test("a number can be on one account only, and changing it means verifying again", async () => {
  assert.equal((await call("PATCH", "/me", "grace", { phone: phone(1) })).json.error.code, "PHONE_TAKEN");

  await call("PATCH", "/me", "amina", { notification_channel: "in_app" });
  const changed = await call("PATCH", "/me", "amina", { phone: phone(2) });
  assert.equal(changed.json.phone_verified_at, null);
  await verifyPhone("amina", phone(2));
});

test("each member chooses who may ask to connect with her", async () => {
  await call("PATCH", "/me", "grace", { message_permission: "none" });
  const closed = await call("POST", "/connections", "achieng", { user_id: ids.grace });
  assert.equal(closed.json.error.code, "NOT_ACCEPTING_REQUESTS");

  await call("PATCH", "/me", "grace", { message_permission: "verified" });
  const unverified = await call("POST", "/connections", "achieng", { user_id: ids.grace });
  assert.equal(unverified.json.error.code, "PHONE_VERIFICATION_REQUIRED");

  // Amina's number is verified, so she may ask.
  assert.equal((await call("POST", "/connections", "amina", { user_id: ids.grace })).status, 201);
});

test("contact details stay private until both have accepted, and can be kept private after", async () => {
  const mine = async () => (await call("GET", "/connections", "grace")).json[0];
  const pending = await mine();
  assert.equal(pending.status, "pending");
  assert.equal(pending.contact, null);
  assert.equal(pending.with.email, undefined);
  assert.equal((await call("GET", `/profiles/${ids.amina}`, "grace")).json.contact, null);

  await call("PATCH", `/connections/${pending.id}`, "grace", { status: "accepted" });
  const number = `+254${phone(2).slice(1)}`;
  assert.deepEqual((await mine()).contact, {
    email: `safe-amina-${run}@example.com`,
    phone: number,
    whatsapp_link: `https://wa.me/${number.slice(1)}`,
  });
  assert.equal((await call("GET", `/profiles/${ids.amina}`, "grace")).json.contact.phone, number);

  // Grace has no verified number, so only her email is shared.
  const graces = (await call("GET", "/connections", "amina")).json[0].contact;
  assert.equal(graces.phone, null);
  assert.equal(graces.whatsapp_link, null);

  await call("PATCH", "/me", "amina", { share_contact: false });
  assert.equal((await mine()).contact, null);
});

test("reports from three different members suspend the one reported, and admins see them", async () => {
  await call("PATCH", "/me", "grace", { message_permission: "anyone" });
  const report = (who: Who, reason = "Asked me for a fee to release funding.") => call("POST", "/reports", who, { user_id: ids.grace, reason });

  assert.equal((await call("POST", "/reports", "amina", { user_id: ids.amina, reason: "Reporting myself" })).status, 400);
  assert.equal((await report("amina")).json.suspended, false);
  assert.equal((await report("amina")).status, 409);
  assert.equal((await report("achieng")).json.suspended, false);
  assert.equal((await report("mumbi")).json.suspended, true);

  assert.equal((await call("GET", "/connections", "grace")).json.error.code, "APPROVAL_REQUIRED");

  assert.equal((await call("GET", "/admin/reports", "amina")).status, 403);
  const list = await call("GET", "/admin/reports", "admin");
  const mine = list.json.members.filter((r: any) => r.reported.id === ids.grace);
  assert.equal(mine.length, 3);
  assert.equal(mine[0].reported.approval_status, "suspended");
});
