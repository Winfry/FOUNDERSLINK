import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// The admin dashboard's lists, member detail and numbers. Runs against
// DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const tag = `Adm${run}`;
const people = {
  admin: { role: "admin", full_name: `${tag} Admin`, status: "approved" },
  amina: { role: "founder", full_name: `${tag} Amina`, status: "draft" },
  otieno: { role: "founder", full_name: `${tag} Otieno`, status: "approved" },
  grace: { role: "investor", full_name: `${tag} Grace`, status: "approved" },
} as const;
type Who = keyof typeof people;

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};

async function call(method: string, path: string, who?: Who, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(who ? { authorization: `Bearer ${tokens[who]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const list = async (query: string) => (await call("GET", `/admin/users?search=${tag}${query}`, "admin")).json;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const { role, full_name, status } = people[who];
    const email = `adm-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, role, full_name, password_hash, approval_status: status, email_verified_at: new Date() } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }
  await call("PUT", "/me/profile", "amina", {
    journey_type: "startup", business_status: "limited_company", business_name: "Afya Booking",
    description: "A clinic booking app for county hospitals", sector: "health", county: "Nairobi", stage: "mvp",
  });
  await call("PUT", "/me/investor-profile", "grace", { organisation_name: "Health Angels" });
});

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("only admins can use the admin pages", async () => {
  for (const path of ["/admin/users", "/admin/stats", "/admin/vetting/applications", `/admin/users/${ids.amina}`]) {
    assert.equal((await call("GET", path, "otieno")).status, 403);
    assert.equal((await call("GET", path)).status, 401);
  }
});

test("the member list can be searched and filtered, and comes a page at a time", async () => {
  const all = await list("");
  assert.equal(all.total, 3);
  // Admins are not in the member list.
  assert.ok(!all.items.some((u: any) => u.role === "admin"));

  const founders = await list("&role=founder");
  assert.deepEqual(founders.items.map((u: any) => u.full_name).sort(), [`${tag} Amina`, `${tag} Otieno`]);

  const waiting = await list("&status=draft");
  assert.deepEqual(waiting.items.map((u: any) => [u.full_name, u.summary, u.sector]), [[`${tag} Amina`, "Afya Booking", "health"]]);
  assert.equal((await list("&role=investor")).items[0].summary, "Health Angels");

  const paged = await list("&page_size=2");
  assert.equal(paged.items.length, 2);
  assert.equal(paged.pages, 2);
  assert.equal((await list("&page_size=2&page=2")).items.length, 1);

  // No secrets in what comes back.
  assert.ok(!JSON.stringify(all).includes("password_hash"));
  assert.equal((await call("GET", "/admin/users?status=nonsense", "admin")).status, 400);
});

test("a member's page shows her profile and her history in order", async () => {
  await call("PATCH", "/vetting/application", "amina", { statement: "I run a clinic booking app in Nairobi." });
  // Submitting needs a confirmed phone. The phone code has its own tests.
  await prisma.user.update({ where: { id: ids.amina }, data: { phone: `+2547${String(run).slice(-7)}7`, phone_verified_at: new Date() } });
  const submitted = await call("POST", "/vetting/application/submit", "amina");
  await call("POST", `/admin/vetting/${submitted.json.application.id}/decision`, "admin", {
    decision: "approve",
    reason: "Identity and business checked by hand.",
    checks: [{ check_type: "identity", result: "pass" }],
  });
  await call("POST", `/admin/users/${ids.amina}/suspend`, "admin", { reason: "Reported by two members." });

  const detail = (await call("GET", `/admin/users/${ids.amina}`, "admin")).json;
  assert.equal(detail.email, `adm-amina-${run}@example.com`);
  assert.equal(detail.approval_status, "suspended");
  assert.equal(detail.founder_profile.business_name, "Afya Booking");
  assert.equal(detail.vetting_application.checks.length, 1);
  assert.deepEqual(detail.reports_against, { messages: 0, member: 0 });

  assert.deepEqual(
    detail.timeline.map((t: any) => [t.event, t.by, t.reason]),
    [
      ["joined", null, null],
      ["applied", null, null],
      ["approve", `${tag} Admin`, "Identity and business checked by hand."],
      ["suspend", `${tag} Admin`, "Reported by two members."],
    ],
  );
  assert.ok(!JSON.stringify(detail).includes("password_hash"));
  assert.ok(!JSON.stringify(detail).includes("totp_secret"));

  // An admin's own account is not a member page.
  assert.equal((await call("GET", `/admin/users/${ids.admin}`, "admin")).status, 404);
});

test("the applications list includes decided ones, with the reason", async () => {
  const res = await call("GET", "/admin/vetting/applications?role=founder&status=suspended", "admin");
  const mine = res.json.items.find((a: any) => a.user.id === ids.amina);
  assert.equal(mine.status, "suspended");
  assert.equal(mine.decision_reason, "Identity and business checked by hand.");
  assert.equal(mine.risk_level, "low");
  assert.ok(res.json.total >= 1);
});

test("the dashboard numbers add up", async () => {
  const stats = (await call("GET", "/admin/stats", "admin")).json;

  assert.ok(stats.members.total >= 3);
  const roles = Object.values(stats.members.by_role as Record<string, number>).reduce((a, b) => a + b, 0);
  const statuses = Object.values(stats.members.by_status as Record<string, number>).reduce((a, b) => a + b, 0);
  assert.equal(roles, stats.members.total);
  assert.equal(statuses, stats.members.total);
  assert.equal(stats.members.by_role.admin, undefined);

  // Six months, the newest last, and this month has our sign-ups.
  assert.equal(stats.registrations.length, 6);
  const thisMonth = stats.registrations.at(-1);
  assert.equal(thisMonth.month, new Date().toISOString().slice(0, 7));
  assert.ok(thisMonth.founders >= 2 && thisMonth.investors >= 1);
});

test("an admin can list admins and make another, and that is logged", async () => {
  const email = `adm-new-${run}@example.com`;
  ids.newAdmin = "";

  assert.equal((await call("POST", "/admin/admins", "otieno", { email, full_name: "Sneaky", password: "a-long-enough-password" })).status, 403);
  assert.equal((await call("POST", "/admin/admins", "admin", { email, full_name: "New Admin", password: "short" })).status, 400);

  const made = await call("POST", "/admin/admins", "admin", { email, full_name: `${tag} New Admin`, password: "a-long-enough-password" });
  assert.equal(made.status, 201);
  assert.equal(made.json.totp_enabled, false);
  ids.newAdmin = made.json.id;
  assert.equal((await call("POST", "/admin/admins", "admin", { email, full_name: "Again", password: "a-long-enough-password" })).status, 409);

  // The new admin can sign in and use the admin pages.
  const login = await call("POST", "/auth/login", undefined, { email, password: "a-long-enough-password" });
  tokens.newAdmin = login.json.token;
  assert.equal((await call("GET", "/admin/stats", "newAdmin" as Who)).status, 200);

  const admins = (await call("GET", "/admin/admins", "admin")).json;
  assert.ok(admins.some((a: any) => a.id === made.json.id));
  assert.ok(!JSON.stringify(admins).includes("password_hash"));

  const log = (await call("GET", "/admin/actions", "admin")).json.find((a: any) => a.target.id === made.json.id);
  assert.equal(log.action, "create_admin");
  assert.equal(log.admin.full_name, `${tag} Admin`);
});

test("a suspended admin loses the admin pages at once, and nobody can suspend herself", async () => {
  const own = await call("POST", `/admin/users/${ids.admin}/suspend`, "admin", { reason: "Testing on myself." });
  assert.equal(own.json.error.code, "OWN_ACCOUNT");

  assert.equal((await call("GET", "/admin/stats", "newAdmin" as Who)).status, 200);
  await call("POST", `/admin/users/${ids.newAdmin}/suspend`, "admin", { reason: "Left the team." });

  // Her token is still valid, but the database says she is no longer active.
  const blocked = await call("GET", "/admin/stats", "newAdmin" as Who);
  assert.equal(blocked.status, 403);
  assert.equal((await call("GET", "/admin/vetting/queue", "newAdmin" as Who)).status, 403);

  await call("POST", `/admin/users/${ids.newAdmin}/reinstate`, "admin", { reason: "Back on the team." });
  assert.equal((await call("GET", "/admin/stats", "newAdmin" as Who)).status, 200);
});
