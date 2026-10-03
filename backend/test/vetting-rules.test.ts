import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { vettingRules } from "../src/modules/vetting/vetting.service.js";
import { prisma } from "../src/shared/db.js";

// The two-admin rule for investors and re-checks of approved members.
// Runs against DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  adminOne: { role: "admin", full_name: "First Admin", status: "approved" },
  adminTwo: { role: "admin", full_name: "Second Admin", status: "approved" },
  grace: { role: "investor", full_name: "Grace Investor", status: "draft" },
  peter: { role: "investor", full_name: "Peter Investor", status: "draft" },
  amina: { role: "founder", full_name: "Amina Founder", status: "draft" },
} as const;
type Who = keyof typeof people;

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
const applications: Record<string, string> = {};

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

async function apply(who: Who, n: number) {
  await call("PATCH", "/vetting/application", who, {
    phone: `07${String(run).slice(-7)}${n}`,
    organisation_name: "Health Angels",
    organisation_website: "https://example.com",
    statement: "I invest in early health startups on behalf of Health Angels.",
  });
  applications[who] = (await call("POST", "/vetting/application/submit", who)).json.application.id;
}

const decide = (admin: Who, who: Who, decision: string, reason = "Organisation and track record checked.") =>
  call("POST", `/admin/vetting/${applications[who]}/decision`, admin, { decision, reason });
const statusOf = async (who: Who) => (await call("GET", "/me", who)).json.approval_status;
const dueFor = async (who: Who) =>
  (await call("GET", "/admin/vetting/rechecks", "adminOne")).json.find((r: any) => r.user.id === ids[who]);

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const { role, full_name, status } = people[who];
    // Lowercase, because sign-in lowercases the email it is given.
    const email = `rules-${who.toLowerCase()}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, role, full_name, password_hash, approval_status: status, email_verified_at: new Date() } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }
  await call("PUT", "/me/investor-profile", "grace", { organisation_name: "Health Angels" });
  await call("PUT", "/me/investor-profile", "peter", { organisation_name: "Health Angels" });

  // The rule as TEAM_DECISIONS asks for it in production.
  vettingRules.investorApprovals = 2;
});

after(async () => {
  vettingRules.investorApprovals = 1;
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("an investor needs two different admins to approve", async () => {
  await apply("grace", 1);

  const first = await decide("adminOne", "grace", "approve");
  assert.deepEqual(first.json, { application_id: applications.grace, approval_status: "in_review", approvals: { given: 1, needed: 2 } });
  assert.equal(await statusOf("grace"), "in_review");

  // The same admin cannot give both approvals.
  assert.equal((await decide("adminOne", "grace", "approve")).json.error.code, "SAME_ADMIN");
  assert.equal(await statusOf("grace"), "in_review");

  const second = await decide("adminTwo", "grace", "approve", "Confirmed with the fund's office.");
  assert.equal(second.json.approval_status, "approved");
  assert.equal(await statusOf("grace"), "approved");

  const log = (await call("GET", "/admin/actions", "adminOne")).json.filter((a: any) => a.target.id === ids.grace);
  assert.deepEqual(log.map((a: any) => [a.action, a.admin.full_name]), [
    ["approve", "Second Admin"],
    ["approve_first", "First Admin"],
  ]);
});

test("one admin can still reject an investor, and that clears an earlier approval", async () => {
  await apply("peter", 2);
  await decide("adminOne", "peter", "approve");

  assert.equal((await decide("adminTwo", "peter", "reject", "The fund says he does not work there.")).json.approval_status, "rejected");
  const application = await prisma.vettingApplication.findUniqueOrThrow({ where: { id: applications.peter } });
  assert.equal(application.first_approved_by, null);
});

test("a founder still needs only one admin", async () => {
  await apply("amina", 3);
  assert.equal((await decide("adminOne", "amina", "approve", "Identity checked by hand.")).json.approval_status, "approved");
});

test("an approved member who changes a key detail is listed to be looked at again", async () => {
  assert.equal(await dueFor("grace"), undefined);

  await call("PUT", "/me/investor-profile", "grace", { organisation_name: "Health Angels", job_title: "Partner" });
  assert.equal(await dueFor("grace"), undefined);

  await call("PUT", "/me/investor-profile", "grace", { organisation_name: "Another Fund Entirely" });
  const due = await dueFor("grace");
  assert.equal(due.reason, "Changed the organisation she invests for");
  // She stays approved while she waits.
  assert.equal(await statusOf("grace"), "approved");

  assert.equal((await call("GET", "/admin/vetting/rechecks", "grace")).status, 403);
  const confirmed = await call("POST", `/admin/vetting/${applications.grace}/recheck`, "adminOne", {
    outcome: "confirm",
    reason: "New organisation checked on its website.",
  });
  assert.equal(confirmed.json.approval_status, "approved");
  assert.equal(await dueFor("grace"), undefined);
});

test("approval lasts a year, and a re-check can end in suspension", async () => {
  const application = await prisma.vettingApplication.findUniqueOrThrow({ where: { id: applications.amina } });
  const days = (application.recheck_due_at!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  assert.ok(days > 364 && days <= 365);

  // A year passes.
  await prisma.vettingApplication.update({ where: { id: applications.amina }, data: { recheck_due_at: new Date(Date.now() - 1000) } });
  assert.equal((await dueFor("amina")).reason, "Yearly re-check");

  const outcome = await call("POST", `/admin/vetting/${applications.amina}/recheck`, "adminTwo", {
    outcome: "suspend",
    reason: "Could not be reached and the business is closed.",
  });
  assert.equal(outcome.json.approval_status, "suspended");
  assert.equal(await statusOf("amina"), "suspended");
  assert.equal(await dueFor("amina"), undefined);
});
