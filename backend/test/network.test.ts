import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Vetting, investors as users, and profiles, as one story: a founder, a
// real investor and a fake one apply, an admin decides, and what each
// can see changes with their approval.
//
// Runs against the database in DATABASE_URL (with the demo data loaded)
// and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const fundName = `Test Health Angels ${run}`;
const emails = {
  admin: `admin-${run}@example.com`,
  founder: `founder-${run}@example.com`,
  investor: `investor-${run}@example.com`,
  fake: `fake-${run}@mailinator.com`,
  claimer: `claimer-${run}@example.com`,
};

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
const applications: Record<string, string> = {};

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

async function signUp(who: keyof typeof emails, role: string, full_name: string) {
  const res = await call("POST", "/auth/register", undefined, { email: emails[who], password, full_name, role });
  assert.equal(res.status, 201);
  tokens[who] = res.json.token;
  ids[who] = res.json.user.id;
  // Each proves her email address, which vetting requires. Email has its own tests.
  await call("POST", "/auth/email/verify", who, { code: res.json.email_verification.dev_code });
  return res;
}

// The number each account has confirmed by code. The code has its own tests.
const phoneOf = (who: string) => `+2547${String(run).slice(-7)}${Object.keys(emails).indexOf(who)}`;

async function apply(who: string, application: object) {
  // Submitting needs a confirmed phone on the account.
  await prisma.user.update({ where: { id: ids[who]! }, data: { phone: phoneOf(who), phone_verified_at: new Date() } });
  assert.equal((await call("PATCH", "/vetting/application", who, application)).status, 200);
  const res = await call("POST", "/vetting/application/submit", who);
  assert.equal(res.status, 200);
  applications[who] = res.json.application.id;
  // The applicant is never sent the risk level or its signals.
  assert.equal("risk_level" in res.json.application, false);
  assert.equal("risk_signals" in res.json.application, false);
  // What staff see: the stored row.
  return prisma.vettingApplication.findUniqueOrThrow({ where: { id: res.json.application.id } });
}

const decide = (who: string, decision: string, reason: string, checks?: object[]) =>
  call("POST", `/admin/vetting/${applications[who]}/decision`, "admin", { decision, reason, checks });

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  // Admins cannot sign up, so this one is created the way the script does it.
  await prisma.user.create({
    data: {
      email: emails.admin,
      full_name: "Test Admin",
      role: "admin",
      approval_status: "approved",
      password_hash: await bcrypt.hash(password, 4),
    },
  });
  const login = await call("POST", "/auth/login", undefined, { email: emails.admin, password });
  tokens.admin = login.json.token;
});

after(async () => {
  await prisma.funder.deleteMany({ where: { name: fundName } });
  await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  await prisma.$disconnect();
  server.close();
});

test("people sign up as founder or investor, never as expert or admin", async () => {
  const founder = await signUp("founder", "founder", "Amina Founder");
  assert.equal(founder.json.user.approval_status, "draft");

  const investor = await signUp("investor", "investor", "Grace Investor");
  assert.equal(investor.json.user.role, "investor");

  await signUp("fake", "investor", "Quick Capital");

  const admin = await call("POST", "/auth/register", undefined, {
    email: `x-${emails.admin}`,
    password,
    full_name: "Sneaky",
    role: "admin",
  });
  assert.equal(admin.status, 400);

  // Experts are cut from sign-up (TEAM_DECISIONS D11).
  const expert = await call("POST", "/auth/register", undefined, {
    email: `e-${emails.admin}`,
    password,
    full_name: "Wanjiru Lawyer",
    role: "expert",
  });
  assert.equal(expert.status, 400);
  assert.equal(expert.json.error.code, "VALIDATION_ERROR");
  assert.equal(await prisma.user.count({ where: { email: `e-${emails.admin}` } }), 0);
  const options = await call("GET", "/meta/options");
  assert.deepEqual(options.json.signup_roles, ["founder", "investor"]);
  assert.deepEqual(options.json.instruments, ["equity", "convertible_note"]);
});

test("each role fills in its own profile, and only its own", async () => {
  const founder = await call("PUT", "/me/profile", "founder", {
    journey_type: "startup",
    business_status: "limited_company",
    business_name: "Afya Booking",
    description: "A clinic booking app for county hospitals",
    sector: "health",
    county: "Nairobi",
    funding_amount_kes: 1_000_000,
    stage: "mvp",
    instruments: ["equity"],
  });
  assert.equal(founder.status, 200);

  const investor = await call("PUT", "/me/investor-profile", "investor", {
    organisation_name: "Test Health Angels",
    job_title: "Partner",
    organisation_website: "https://example.com",
  });
  assert.equal(investor.status, 200);

  // Both agree to be seen by other members. Consent has its own tests.
  for (const who of ["founder", "investor"]) {
    await call("POST", "/me/consents", who, { purpose: "profile_visibility", granted: true });
  }

  assert.equal((await call("PUT", "/me/investor-profile", "founder", { organisation_name: "Nope" })).status, 403);
  assert.equal((await call("PUT", "/me/profile", "investor", {})).status, 403);
});

test("an investor describes what she funds, and founders do not see it before she is approved", async () => {
  const mandate = {
    name: fundName,
    kind: "angel",
    mandate_text: "We back early Kenyan health startups with a working product.",
    journey_types: ["startup"],
    sectors: ["health"],
    stages: ["mvp"],
    instruments: ["equity"],
    ticket_min_kes: 500_000,
    ticket_max_kes: 5_000_000,
  };
  const saved = await call("PUT", "/me/funder", "investor", mandate);
  assert.equal(saved.status, 200);
  assert.equal(saved.json.is_demo, false);

  const bad = await call("PUT", "/me/funder", "investor", { ...mandate, ticket_min_kes: 9_000_000 });
  assert.equal(bad.status, 400);

  const matches = await call("GET", "/funding/matches", "founder");
  const all = [...matches.json.apply_now, ...matches.json.apply_after, ...matches.json.not_for_you];
  assert.ok(!all.some((c: any) => c.funder.name === fundName));
});

test("an unapproved member cannot open anyone's profile", async () => {
  const res = await call("GET", `/profiles/${ids.investor}`, "founder");
  assert.equal(res.status, 403);
  assert.equal(res.json.error.code, "APPROVAL_REQUIRED");
});

test("applications are scored for risk when submitted, and lock after that", async () => {
  const incomplete = await call("POST", "/vetting/application/submit", "founder");
  assert.equal(incomplete.status, 400);

  // A number typed on the form is not a confirmed one.
  await call("PATCH", "/vetting/application", "founder", { phone: "0712000001", statement: "I run Afya Booking and want to meet health investors." });
  const unconfirmed = await call("POST", "/vetting/application/submit", "founder");
  assert.equal(unconfirmed.status, 409);
  assert.equal(unconfirmed.json.error.code, "PHONE_NOT_VERIFIED");

  const founder = await apply("founder", {
    phone: "0712000001",
    statement: "I run Afya Booking and want to meet health investors.",
  });
  assert.equal(founder.risk_level, "low");
  // The application carries the account's confirmed number, not the typed one.
  assert.equal(founder.phone, phoneOf("founder"));

  const investor = await apply("investor", {
    phone: "0712000002",
    organisation_name: "Test Health Angels",
    organisation_website: "https://example.com",
    statement: "Partner at Test Health Angels. We have invested in four clinics.",
  });
  assert.equal(investor.risk_level, "low");

  // Another account's application already names the number the fake
  // one has confirmed.
  await prisma.vettingApplication.update({ where: { id: applications.investor! }, data: { phone: phoneOf("fake") } });
  const fake = await apply("fake", {
    phone: "+254712000002",
    organisation_name: "Quick Capital",
    statement: "Guaranteed funding for every founder. Pay a small processing fee to start.",
  });
  assert.equal(fake.risk_level, "high");
  assert.ok(fake.risk_signals.includes("Uses a disposable email address"));
  assert.ok(fake.risk_signals.includes("Mentions a fee that people must pay"));
  assert.ok(fake.risk_signals.includes("The same phone number is used on another account"));

  const edit = await call("PATCH", "/vetting/application", "founder", { statement: "Changed after submitting it." });
  assert.equal(edit.status, 409);
});

test("the applicant is not shown the risk level or the signals that flagged her", async () => {
  const mine = await call("GET", "/vetting/application", "fake");
  assert.equal(mine.status, 200);
  assert.equal(mine.json.application.id, applications.fake);
  assert.equal("risk_level" in mine.json.application, false);
  assert.equal("risk_signals" in mine.json.application, false);
  assert.doesNotMatch(JSON.stringify(mine.json), /disposable email|Mentions a fee/);

  // Staff still see both.
  const review = await call("GET", `/admin/vetting/${applications.fake}`, "admin");
  assert.equal(review.json.risk_level, "high");
  assert.ok(review.json.risk_signals.includes("Mentions a fee that people must pay"));
});

test("only admins see the queue, and the riskiest application comes first", async () => {
  assert.equal((await call("GET", "/admin/vetting/queue", "founder")).status, 403);
  assert.equal((await call("GET", "/admin/vetting/queue")).status, 401);

  const queue = await call("GET", "/admin/vetting/queue", "admin");
  assert.equal(queue.status, 200);
  const mine = queue.json.filter((a: any) => Object.values(applications).includes(a.id));
  assert.equal(mine[0].user.email, emails.fake);

  const detail = await call("GET", `/admin/vetting/${applications.fake}`, "admin");
  assert.equal(detail.json.user.approval_status, "in_review");
});

test("before approval an investor sees how many businesses match, not who they are", async () => {
  const before = await call("GET", "/investor/matches", "investor");
  assert.equal(before.json.approved, false);
  assert.equal(before.json.founders.length, before.json.count);

  const approved = await decide("founder", "approve", "Identity and business checked by hand.", [
    { check_type: "identity", result: "pass" },
    { check_type: "phone", result: "pass", method: "otp" },
  ]);
  assert.equal(approved.json.approval_status, "approved");

  const after = await call("GET", "/investor/matches", "investor");
  assert.equal(after.json.count, before.json.count + 1);
  assert.match(after.json.message, /match(es)? your fund\. Verify to see who they are and connect\./);

  // She sees what kind of business each is, and nothing that says whose.
  const card = after.json.founders.find((f: any) => f.headline === "Health startup, Nairobi, mvp, seeking KSh 1,000,000");
  assert.deepEqual(Object.keys(card).sort(), ["anonymised", "band", "county", "funding_amount_kes", "headline", "ready", "sector", "stage"]);
  assert.equal(card.anonymised, true);
  assert.ok(!JSON.stringify(after.json).includes("Amina"));
  assert.ok(!JSON.stringify(after.json).includes("Afya Booking"));
});

test("an admin decision needs a reason, is final, and is logged", async () => {
  assert.equal((await decide("fake", "reject", "")).status, 400);

  const rejected = await decide("fake", "reject", "Asks founders for a fee and gave no organisation we could check.");
  assert.equal(rejected.json.approval_status, "rejected");
  assert.equal((await decide("fake", "approve", "Changed my mind.")).status, 409);

  const actions = await call("GET", "/admin/actions", "admin");
  const mine = actions.json.filter((a: any) => a.target.id === ids.fake);
  assert.deepEqual(mine.map((a: any) => a.action), ["reject"]);
});

test("once the investor is approved, both sides see each other", async () => {
  await decide("investor", "approve", "Organisation and track record checked.", [
    { check_type: "organisation", result: "pass", method: "domain" },
  ]);

  const investorView = await call("GET", "/investor/matches", "investor");
  const card = investorView.json.founders.find((f: any) => f.user_id === ids.founder);
  assert.equal(card.full_name, "Amina Founder");
  assert.equal(card.band, "strong");
  assert.equal(card.ready, true);
  assert.equal(card.email, undefined);

  const founderView = await call("GET", "/funding/matches", "founder");
  const fund = founderView.json.apply_now.find((c: any) => c.funder.name === fundName);
  assert.equal(fund.source, "maintained_by_funder");
  assert.equal(fund.investor.full_name, "Grace Investor");
  assert.deepEqual(fund.risk_factors, []);
});

test("a profile shows the fit and a track record labelled by source", async () => {
  const selfReported = await call("POST", "/me/portfolio", "investor", {
    company_name: "Secret Clinic Ltd",
    sector: "health",
    stage: "mvp",
    year: 2025,
  });
  assert.equal(selfReported.json.source, "self_reported");

  await call("POST", "/me/portfolio", "investor", {
    company_name: "Public Pharmacy Co",
    sector: "health",
    year: 2024,
    source_url: "https://example.com/press",
  });
  const hidden = await call("POST", "/me/portfolio", "investor", { company_name: "Hidden Co", sector: "agri" });
  await call("PATCH", `/me/portfolio/${hidden.json.id}`, "investor", { visibility: "hidden" });
  const patched = await call("PATCH", `/me/portfolio/${hidden.json.id}`, "investor", { year: 2023 });
  assert.equal(patched.json.visibility, "hidden");

  const profile = await call("GET", `/profiles/${ids.investor}`, "founder");
  assert.equal(profile.status, 200);
  assert.equal(profile.json.investor.organisation_name, "Test Health Angels");
  assert.equal(profile.json.fit.band, "strong");
  assert.deepEqual(profile.json.fit.track_record_highlights, [
    "Has backed 2 health businesses before",
    "Has invested at the mvp stage 1 time",
  ]);

  const record = profile.json.track_record;
  assert.equal(record.length, 2);
  // Named only when the deal is public or the company agreed.
  assert.deepEqual(
    record.map((e: any) => [e.company_name, e.source_label]),
    [
      [null, "Self-reported"],
      ["Public Pharmacy Co", "Public source"],
    ],
  );

  await call("POST", "/me/ventures", "founder", { venture_name: "Dawa Delivery", sector: "health", role: "Co-founder" });
  const founderProfile = await call("GET", `/profiles/${ids.founder}`, "investor");
  assert.equal(founderProfile.json.founder.business_name, "Afya Booking");
  assert.equal(founderProfile.json.track_record[0].source_label, "Self-reported");
  assert.equal(founderProfile.json.email, undefined);

  assert.equal((await call("GET", `/profiles/${ids.fake}`, "founder")).status, 404);
});

test("suspending a member takes effect at once and can be undone", async () => {
  const reason = { reason: "Two members reported requests for money." };
  assert.equal((await call("POST", `/admin/users/${ids.investor}/suspend`, "admin", reason)).status, 200);

  assert.equal((await call("GET", `/profiles/${ids.founder}`, "investor")).status, 403);
  const founderView = await call("GET", "/funding/matches", "founder");
  const all = [...founderView.json.apply_now, ...founderView.json.apply_after, ...founderView.json.not_for_you];
  assert.ok(!all.some((c: any) => c.funder.name === fundName));

  assert.equal((await call("POST", `/admin/users/${ids.investor}/suspend`, "admin", reason)).status, 409);
  const back = await call("POST", `/admin/users/${ids.investor}/reinstate`, "admin", { reason: "Reports were mistaken." });
  assert.equal(back.json.approval_status, "approved");
});

test("an investor can ask to take over a public record, and gets it on approval", async () => {
  await signUp("claimer", "investor", "Njeri Claimer");
  await call("PUT", "/me/investor-profile", "claimer", { organisation_name: "Rift Growth Fund" });
  const record = await prisma.funder.findUniqueOrThrow({ where: { name: "Rift Growth Fund (demo)" } });

  await apply("claimer", {
    phone: "0712000009",
    organisation_name: "Rift Growth Fund",
    organisation_website: "https://example.org",
    statement: "I am an associate at Rift Growth Fund and keep our listing up to date.",
    claims_funder_id: record.id,
  });

  // Asking is not owning.
  const early = await call("PUT", "/me/funder", "claimer", { name: "Another Fund", kind: "vc", mandate_text: "Something else entirely.", journey_types: ["startup"], instruments: ["equity"], ticket_min_kes: 1, ticket_max_kes: 2 });
  assert.equal(early.json.error.code, "CLAIM_PENDING");

  const review = await call("GET", `/admin/vetting/${applications.claimer}`, "admin");
  assert.equal(review.json.claims_funder.name, "Rift Growth Fund (demo)");

  await decide("claimer", "approve", "Confirmed with the fund by email.");
  const me = await call("GET", "/me", "claimer");
  assert.equal(me.json.funder.name, "Rift Growth Fund (demo)");
});
