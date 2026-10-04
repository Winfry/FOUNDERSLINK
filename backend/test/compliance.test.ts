import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { answerCompliance, applicableItems } from "../src/ai/standin.js";
import type { AnswerSource, MatchProfile } from "../src/ai/types.js";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// The compliance checklist, Ask Compliance, deadlines and the admin
// report. The API tests run against DATABASE_URL with the demo data
// loaded, and remove what they create.

// --- The rules on their own: no database, no server ---

const business: MatchProfile = {
  journey_type: "startup",
  business_status: "informal",
  description: "A salon in Mombasa",
  sector: "retail",
  county: "Mombasa",
  funding_amount_kes: null,
  use_of_funds: null,
  stage: null,
  instruments: [],
  months_trading: 18,
  monthly_revenue_band: "50k_to_200k",
  has_employees: null,
  handles_personal_data: null,
};

const rules = [
  { id: "everyone", scope: "business", deal_type: null, applies_when: {} },
  { id: "registered_only", scope: "business", deal_type: null, applies_when: { business_statuses: ["limited_company"] } },
  { id: "coast_permit", scope: "business", deal_type: null, applies_when: { counties: ["Mombasa", "Kilifi"] } },
  { id: "employers", scope: "business", deal_type: null, applies_when: { has_employees: true } },
  { id: "term_sheet", scope: "deal", deal_type: "investment", applies_when: {} },
];

test("an item applies only when every condition on it holds", () => {
  assert.deepEqual(applicableItems(business, rules, "business", null), ["everyone", "coast_permit"]);

  const grown = { ...business, business_status: "limited_company", county: "Turkana", has_employees: true };
  assert.deepEqual(applicableItems(grown, rules, "business", null), ["everyone", "registered_only", "employers"]);
});

test("a yes/no condition is not assumed when the founder has not answered", () => {
  assert.ok(!applicableItems({ ...business, has_employees: null }, rules, "business", null).includes("employers"));
  assert.ok(!applicableItems({ ...business, has_employees: false }, rules, "business", null).includes("employers"));
});

test("deal items are kept apart from business items", () => {
  assert.deepEqual(applicableItems(business, rules, "deal", "investment"), ["term_sheet"]);
  assert.deepEqual(applicableItems(business, rules, "deal", "cofounder_partnership"), []);
});

const verified: AnswerSource = {
  id: "kra_pin",
  title: "KRA PIN for the business",
  why: "The business needs its own PIN to pay tax.",
  institution: "Kenya Revenue Authority",
  source_url: "https://example.org/kra-pin",
  last_verified_at: new Date("2026-10-01"),
  needs_review: false,
};

test("an answer is given only from an item with a current official source", () => {
  const good = answerCompliance("Do I need a KRA PIN?", [verified]);
  assert.equal(good.confident, true);
  assert.deepEqual(good.citations, [
    { source: "Kenya Revenue Authority", url: "https://example.org/kra-pin", last_verified: "2026-10-01T00:00:00.000Z" },
  ]);

  for (const stale of [{ ...verified, source_url: null }, { ...verified, needs_review: true }]) {
    const answer = answerCompliance("Do I need a KRA PIN?", [stale]);
    assert.equal(answer.confident, false);
    assert.equal(answer.suggest_expert, true);
    assert.deepEqual(answer.citations, []);
  }

  const unknown = answerCompliance("How do I import a tractor?", [verified]);
  assert.equal(unknown.confident, false);
  assert.match(unknown.answer, /will not guess/);
});

// --- The API ---

const run = Date.now();
const password = "correct-horse-battery";
const emails = {
  founder: `c-founder-${run}@example.com`,
  other: `c-other-${run}@example.com`,
  investor: `c-investor-${run}@example.com`,
  admin: `c-admin-${run}@example.com`,
};

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};

async function call(method: string, path: string, who?: string, body?: unknown) {
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

const clinicApp = {
  business_status: "informal",
  description: "An app for booking clinic visits in Mombasa",
  sector: "health",
  county: "Mombasa",
  funding_amount_kes: 1_000_000,
  stage: "mvp",
  instruments: ["equity"],
  has_employees: false,
  already_have: ["kra_pin"],
};

const ids = (items: any[]) => items.map((i) => i.id).sort();

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  for (const [who, role] of [["founder", "founder"], ["other", "founder"], ["investor", "investor"]] as const) {
    const res = await call("POST", "/auth/register", undefined, { email: emails[who], password, full_name: `Test ${who}`, role });
    tokens[who] = res.json.token;
  }
  await prisma.user.create({
    data: { email: emails.admin, full_name: "Test Admin", role: "admin", approval_status: "approved", password_hash: await bcrypt.hash(password, 4) },
  });
  tokens.admin = (await call("POST", "/auth/login", undefined, { email: emails.admin, password })).json.token;
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  await prisma.$disconnect();
  server.close();
});

test("the checklist needs a founder who has finished onboarding", async () => {
  assert.equal((await call("GET", "/compliance")).status, 401);
  assert.equal((await call("GET", "/compliance", "investor")).status, 403);
  assert.equal((await call("GET", "/compliance", "founder")).json.error.code, "PROFILE_REQUIRED");
});

test("a founder sees the items that apply to her business, with what she ticked in onboarding done", async () => {
  await call("PUT", "/me/profile", "founder", clinicApp);
  const res = await call("GET", "/compliance", "founder");

  assert.equal(res.status, 200);
  assert.deepEqual(ids(res.json.items), [
    "brs_registration",
    "business_bank_account",
    "county_business_permit",
    "kra_pin",
    "tax_compliance_certificate",
  ]);
  assert.deepEqual(res.json.progress, { done: 1, total: 5, text: "1 of 5 done" });
  assert.equal(res.json.items.find((i: any) => i.id === "kra_pin").status, "complete");
  assert.equal(res.json.county.covered, true);
  assert.match(res.json.disclaimer, /not legal advice/);
  // Never a score.
  assert.equal(res.json.score, undefined);
});

test("the checklist changes with the business, and says when a county is not covered", async () => {
  await call("PUT", "/me/profile", "founder", {
    ...clinicApp,
    business_status: "limited_company",
    county: "Turkana",
    has_employees: true,
    handles_personal_data: true,
    already_have: [],
  });
  const res = await call("GET", "/compliance", "founder");

  assert.deepEqual(ids(res.json.items), [
    "brs_registration",
    "business_bank_account",
    "employer_registrations",
    "etims",
    "kra_pin",
    "odpc_registration",
    "tax_compliance_certificate",
  ]);
  assert.equal(res.json.county.covered, false);
  assert.match(res.json.county.message, /Turkana are not covered yet/);
  // Re-saving onboarding without the tick does not undo her progress.
  assert.equal(res.json.progress.done, 1);
});

test("marking an item complete closes the matching gap on her funding matches", async () => {
  // Savanna Angels fit her, and require a registered business.
  const { id: savannaId } = await prisma.funder.findUniqueOrThrow({ where: { name: "Savanna Angels Network (demo)" } });
  const savanna = async () => {
    const matches = await call("GET", "/funding/matches", "founder");
    const all = [...matches.json.apply_now, ...matches.json.apply_after].map((c: any) => ({ ...c, pitch: matches.json.apply_now.includes(c) }));
    return all.find((c: any) => c.funder.id === savannaId);
  };
  assert.deepEqual((await savanna()).gaps.map((g: any) => g.ref), ["brs_registration"]);
  assert.equal((await savanna()).pitch, false);

  const started = await call("PATCH", "/compliance/brs_registration/status", "founder", {
    status: "in_progress",
    note: "Name search done on eCitizen",
  });
  assert.deepEqual(started.json, { item_id: "brs_registration", status: "in_progress", note: "Name search done on eCitizen" });
  assert.deepEqual((await savanna()).gaps.map((g: any) => g.ref), ["brs_registration"]);

  // Done: Savanna moves from "pitch after you fix this" to "pitch".
  await call("PATCH", "/compliance/brs_registration/status", "founder", { status: "complete" });
  assert.deepEqual((await savanna()).gaps, []);
  assert.equal((await savanna()).pitch, true);

  const item = await call("GET", "/compliance/brs_registration", "founder");
  assert.equal(item.json.status, "complete");
  assert.equal(item.json.note, "Name search done on eCitizen");

  const me = await call("GET", "/me", "founder");
  assert.deepEqual(me.json.founder_profile.already_have.sort(), ["brs_registration", "kra_pin"]);
});

test("status updates are validated", async () => {
  assert.equal((await call("PATCH", "/compliance/made_up/status", "founder", { status: "complete" })).status, 404);
  assert.equal((await call("PATCH", "/compliance/kra_pin/status", "founder", { status: "nearly" })).status, 400);
  assert.equal((await call("PATCH", "/compliance/kra_pin/status", "investor", { status: "complete" })).status, 403);
});

test("a founder records her own deadlines and sees which are overdue", async () => {
  assert.deepEqual((await call("GET", "/compliance/deadlines", "founder")).json, []);

  await call("PUT", "/compliance/tax_compliance_certificate/deadline", "founder", { due_date: "2030-06-30" });
  await call("PUT", "/compliance/kra_pin/deadline", "founder", { due_date: "2020-01-31", recurrence: null });

  const res = await call("GET", "/compliance/deadlines", "founder");
  assert.deepEqual(
    res.json.map((d: any) => [d.item_id, d.overdue, d.recurrence]),
    [
      ["kra_pin", true, null],
      // Takes the item's own recurrence when she does not give one.
      ["tax_compliance_certificate", false, "annual"],
    ],
  );
  assert.deepEqual((await call("GET", "/compliance/deadlines", "other")).json, []);
});

test("Ask Compliance does not answer from an item nobody has verified, and logs the question", async () => {
  const res = await call("POST", "/compliance/ask", "founder", { question: "Do I need a KRA PIN for my business?" });
  assert.equal(res.status, 200);
  assert.equal(res.json.engine, "stand_in");
  // The demo items have no official source yet, so there is nothing to cite.
  assert.equal(res.json.confident, false);
  assert.equal(res.json.suggest_expert, true);
  assert.deepEqual(res.json.citations, []);

  const logged = await prisma.complianceQuestion.findUniqueOrThrow({ where: { id: res.json.id } });
  assert.equal(logged.question, "Do I need a KRA PIN for my business?");

  assert.equal((await call("POST", `/compliance/questions/${res.json.id}/feedback`, "other", { feedback: "helpful" })).status, 404);
  const rated = await call("POST", `/compliance/questions/${res.json.id}/feedback`, "founder", { feedback: "not_helpful" });
  assert.equal(rated.json.feedback, "not_helpful");

  assert.equal((await call("POST", "/compliance/ask", "founder", { question: "KRA?" })).status, 400);
});

test("admins get a freshness report with the items needing attention first", async () => {
  assert.equal((await call("GET", "/admin/compliance/sources", "founder")).status, 403);

  const res = await call("GET", "/admin/compliance/sources", "admin");
  assert.equal(res.json.total, res.json.items.length);
  const kra = res.json.items.find((i: any) => i.id === "kra_pin");
  assert.deepEqual(kra.flags, ["no_source", "never_verified", "no_owner"]);
});
