import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { sendDeadlineReminders } from "../src/modules/notifications/notifications.service.js";
import { prisma } from "../src/shared/db.js";

// Notifications: who is told about what, reading them, deadline
// reminders, and when an SMS is attempted. Runs against DATABASE_URL and
// removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  amina: { role: "founder", full_name: "Amina Founder" },
  grace: { role: "investor", full_name: "Grace Investor" },
  admin: { role: "admin", full_name: "Test Admin" },
} as const;
type Who = keyof typeof people;

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

const inbox = async (who: Who) => (await call("GET", "/notifications", who)).json;
const types = async (who: Who) => (await inbox(who)).notifications.map((n: any) => n.type);
const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `notif-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, ...people[who], password_hash, approval_status: "approved" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }
  await call("PUT", "/me/profile", "amina", {
    journey_type: "startup",
    business_status: "limited_company",
    description: "A clinic booking app for county hospitals",
    sector: "health",
    county: "Nairobi",
    stage: "mvp",
  });
});

after(async () => {
  await prisma.deal.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("a connection request tells the person asked, and accepting tells the person who asked", async () => {
  assert.equal((await call("GET", "/notifications")).status, 401);
  assert.deepEqual(await inbox("grace"), { unread_count: 0, notifications: [] });

  const asked = await call("POST", "/connections", "amina", { user_id: ids.grace });
  const graces = await inbox("grace");
  assert.equal(graces.unread_count, 1);
  assert.equal(graces.notifications[0].type, "connection_request");
  assert.equal(graces.notifications[0].body, "Amina Founder would like to connect with you.");
  assert.equal(graces.notifications[0].link, "/connections");
  // The person who asked is not notified about her own request.
  assert.deepEqual(await types("amina"), []);

  await call("PATCH", `/connections/${asked.json.id}`, "grace", { status: "accepted" });
  assert.deepEqual(await types("amina"), ["connection_accepted"]);
});

test("a change to a deal tells the other parties, not the one who made it", async () => {
  const deal = await call("POST", "/deals", "amina", { type: "investment", title: `Seed round ${run}`, with_user_id: ids.grace });
  await call("POST", `/deals/${deal.json.id}/stage`, "grace", { to_stage: "due_diligence" });

  const graces = (await inbox("grace")).notifications;
  assert.equal(graces[0].type, "deal_opened");
  assert.equal(graces[0].body, "Amina Founder opened the deal");
  assert.equal(graces[0].link, `/deals/${deal.json.id}`);

  assert.deepEqual(await types("amina"), ["deal_stage_changed", "connection_accepted"]);
});

test("notifications are read one at a time or all at once, and only by their owner", async () => {
  const [first] = (await inbox("grace")).notifications;
  assert.equal((await call("POST", `/notifications/${first.id}/read`, "amina")).status, 404);

  assert.equal((await call("POST", `/notifications/${first.id}/read`, "grace")).json.read, true);
  const unread = (await call("GET", "/notifications?unread=true", "grace")).json;
  assert.equal(unread.unread_count, 1);
  assert.deepEqual(unread.notifications.map((n: any) => n.type), ["connection_request"]);

  assert.deepEqual((await call("POST", "/notifications/read-all", "grace")).json, { marked: 1 });
  assert.equal((await inbox("grace")).unread_count, 0);
});

test("a deadline in the next three days is reminded once", async () => {
  await call("PUT", "/compliance/kra_pin/deadline", "amina", { due_date: days(2).toISOString() });
  await call("PUT", "/compliance/brs_registration/deadline", "amina", { due_date: days(30).toISOString() });

  // Other members' deadlines in the shared database may be reminded too.
  assert.ok((await sendDeadlineReminders()).reminded >= 1);
  const reminders = (await inbox("amina")).notifications.filter((n: any) => n.type === "deadline_reminder");
  assert.equal(reminders.length, 1);
  assert.match(reminders[0].body, /^KRA PIN for the business is due on \d{4}-\d{2}-\d{2}\.$/);
  assert.equal(reminders[0].link, "/compliance/kra_pin");

  await sendDeadlineReminders();
  assert.equal((await inbox("amina")).notifications.filter((n: any) => n.type === "deadline_reminder").length, 1);

  // Moving the date means a new reminder is owed.
  await call("PUT", "/compliance/kra_pin/deadline", "amina", { due_date: days(1).toISOString() });
  await sendDeadlineReminders();
  assert.equal((await inbox("amina")).notifications.filter((n: any) => n.type === "deadline_reminder").length, 2);

  assert.equal((await call("POST", "/admin/jobs/deadline-reminders", "amina")).status, 403);
  assert.equal((await call("POST", "/admin/jobs/deadline-reminders", "admin")).status, 200);
});

test("an SMS is attempted only for a member who chose SMS, verified her number and agreed to be contacted", async () => {
  const latest = async () => (await inbox("grace")).notifications[0].delivery_status;
  // Each change to the deal's terms notifies Grace.
  const deal = (await call("GET", "/deals", "amina")).json[0];
  const update = () => call("PATCH", `/deals/${deal.id}/terms`, "amina", { notes: `Updated ${Math.random()}` });

  await update();
  assert.equal(await latest(), "in_app");

  await call("PATCH", "/me", "grace", { phone: `07${String(run).slice(-7)}9` });
  const code = (await call("POST", "/me/phone/code", "grace")).json.dev_code;
  await call("POST", "/me/phone/verify", "grace", { code });
  await call("PATCH", "/me", "grace", { notification_channel: "sms" });

  // She chose SMS but has not agreed to be contacted.
  await update();
  assert.equal(await latest(), "in_app");

  await call("POST", "/me/consents", "grace", { purpose: "contact", granted: true });
  await update();
  // No SMS provider is set up in tests, and the notification says so.
  assert.equal(await latest(), "sms_not_configured");
});
