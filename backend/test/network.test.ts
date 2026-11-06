import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { confirmPhone, runPhone } from "./phone.js";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";
import { REJECTED_MESSAGE } from "../src/modules/vetting/vetting.service.js";

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
  asked: `asked-${run}@example.com`,
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

// Her phone is confirmed by code first, as the app does; submitting needs it.
async function apply(who: string, phone: string, application: object) {
  await confirmPhone(base, tokens[who]!, phone);
  assert.equal((await call("PATCH", "/vetting/application", who, application)).status, 200);
  const res = await call("POST", "/vetting/application/submit", who);
  assert.equal(res.status, 200);
  applications[who] = res.json.application.id;
  return res.json.application;
}

const decide = (who: string, decision: string, reason: string, checks?: object[]) =>
  call("POST", `/admin/vetting/${applications[who]}/decision`, "admin", { decision, reason, checks });

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

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

test("people sign up as founder, investor or expert, never as admin", async () => {
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

  // The risk check is for staff, so it is read the way staff see it.
  const scored = async (who: string) => (await call("GET", `/admin/vetting/${applications[who]}`, "admin")).json;

  const founder = await apply("founder", runPhone(run, 1), {
    statement: "I run Afya Booking and want to meet health investors.",
  });
  // What she gets back says nothing about the check.
  assert.equal(founder.risk_level, undefined);
  assert.equal((await scored("founder")).risk_level, "low");

  const investor = await apply("investor", runPhone(run, 2), {
    organisation_name: "Test Health Angels",
    organisation_website: "https://example.com",
    statement: "Partner at Test Health Angels. We have invested in four clinics.",
  });
  assert.equal((await scored("investor")).risk_level, "low");

  // The investor's number, typed the other way, cannot be put on a second
  // account, so it can never be confirmed and sent with an application.
  const taken = await call("PATCH", "/me", "fake", { phone: `+254${runPhone(run, 2).slice(1)}` });
  assert.equal(taken.json.error.code, "PHONE_TAKEN");

  // An investor cannot submit without a website (TEAM_DECISIONS D12).
  await call("PATCH", "/vetting/application", "fake", { organisation_name: "Quick Capital", statement: "Guaranteed funding for every founder. Pay a small processing fee to start." });
  const noSite = await call("POST", "/vetting/application/submit", "fake");
  assert.equal(noSite.json.error.code, "APPLICATION_INCOMPLETE");
  assert.match(noSite.json.error.message, /website/);

  const fake = await apply("fake", runPhone(run, 3), {
    organisation_name: "Quick Capital",
    organisation_website: "https://quick-capital.example",
    statement: "Guaranteed funding for every founder. Pay a small processing fee to start.",
  });
  const caught = await scored("fake");
  assert.equal(caught.risk_level, "high");
  assert.ok(caught.risk_signals.includes("Uses a disposable email address"));
  assert.ok(caught.risk_signals.includes("Mentions a fee that people must pay"));

  // FINAL_VERIFICATION section 4, item 12: the applicant never sees which check caught him.
  const own = JSON.stringify((await call("GET", "/vetting/application", "fake")).json);
  for (const secret of ["risk_level", "risk_signals", "disposable", "Mentions a fee", "decided_by", "checks"]) {
    assert.ok(!own.includes(secret), `the applicant can see ${secret}`);
  }

  const edit = await call("PATCH", "/vetting/application", "founder", { statement: "Changed after submitting it." });
  assert.equal(edit.status, 409);
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
  // The reason is in the log for staff...
  assert.equal(mine[0].reason, "Asks founders for a fee and gave no organisation we could check.");

  // ...but he is told only the standard sentence: not the reason, so not which check caught him.
  const told = (await call("GET", "/vetting/application", "fake")).json;
  assert.equal(told.status_reason, REJECTED_MESSAGE);
  const notice = (await call("GET", "/notifications", "fake")).json.notifications.find((n: any) => n.type === "vetting_reject");
  assert.equal(notice.body, REJECTED_MESSAGE);
  // Not the reason (his own statement may mention a fee; the reason must not show).
  assert.ok(!JSON.stringify(told).includes("Asks founders"), "the internal reason reached the applicant");
});

test("an admin can write the applicant her own message, apart from the internal reason", async () => {
  // A request for more says what to add: with no message, the reason is what she reads.
  await signUp("asked", "founder", "Wairimu Asked");
  await apply("asked", runPhone(run, 4), { statement: "I run a small bakery in Nakuru and want to grow." });
  await decide("asked", "needs_info", "Say which county the bakery trades in.");
  assert.equal((await call("GET", "/vetting/application", "asked")).json.status_reason, "Say which county the bakery trades in.");

  // A rejection with a message: she reads the message, and the reason stays internal.
  await call("PATCH", "/vetting/application", "asked", { statement: "I run a small bakery in Nakuru County and want to grow." });
  await call("POST", "/vetting/application/submit", "asked");
  await call("POST", `/admin/vetting/${applications.asked}/decision`, "admin", {
    decision: "reject",
    reason: "The registration number belongs to a different business.",
    member_message: "We could not confirm your business registration. You can apply again with your BRS certificate.",
  });
  const told = (await call("GET", "/vetting/application", "asked")).json;
  assert.equal(told.status_reason, "We could not confirm your business registration. You can apply again with your BRS certificate.");
  assert.ok(!JSON.stringify(told).includes("different business"), "the internal reason reached the applicant");
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

  await apply("claimer", runPhone(run, 9), {
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
