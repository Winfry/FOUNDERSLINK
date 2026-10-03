import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Runs against the database in DATABASE_URL and removes what it creates.

const email = `test-${Date.now()}@example.com`;
const password = "correct-horse-battery";
let base = "";
let server: ReturnType<typeof app.listen>;
let token = "";

async function call(method: string, path: string, body?: unknown, auth?: string) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

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

const startupProfile = {
  journey_type: "startup",
  business_status: "limited_company",
  description: "A clinic booking app for county hospitals",
  sector: "health",
  county: "Nairobi",
  funding_amount_kes: 1_000_000,
  stage: "mvp",
  instruments: ["equity"],
  already_have: ["brs_registration"],
};

test("register returns a token and never the password hash", async () => {
  const res = await call("POST", "/auth/register", { email, password, full_name: "Test Founder" });
  assert.equal(res.status, 201);
  assert.ok(res.json.token);
  assert.equal(res.json.user.role, "founder");
  assert.equal(res.json.user.password_hash, undefined);
  // The session lasts a week, and the response says when it ends.
  const days = (res.json.expires_at - Date.now()) / (24 * 60 * 60 * 1000);
  assert.ok(days > 6.9 && days <= 7);
  token = res.json.token;
});

test("nobody can register as an admin", async () => {
  const res = await call("POST", "/auth/register", {
    email: `role-${email}`,
    password,
    full_name: "Sneaky",
    role: "admin",
  });
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, "VALIDATION_ERROR");
});

test("register rejects a duplicate email and a short password", async () => {
  const dup = await call("POST", "/auth/register", { email, password, full_name: "Test Founder" });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.error.code, "EMAIL_TAKEN");

  const weak = await call("POST", "/auth/register", { email: `x${email}`, password: "short", full_name: "X Y" });
  assert.equal(weak.status, 400);
  assert.equal(weak.json.error.code, "VALIDATION_ERROR");
});

test("login works with the right password and gives one message otherwise", async () => {
  const ok = await call("POST", "/auth/login", { email, password });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);

  const wrongPassword = await call("POST", "/auth/login", { email, password: "nope-nope-nope" });
  const wrongEmail = await call("POST", "/auth/login", { email: `no-${email}`, password });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongEmail.status, 401);
  assert.equal(wrongPassword.json.error.message, wrongEmail.json.error.message);
});

test("/me needs a valid token", async () => {
  assert.equal((await call("GET", "/me")).status, 401);
  assert.equal((await call("GET", "/me", undefined, "not-a-token")).status, 401);

  const me = await call("GET", "/me", undefined, token);
  assert.equal(me.status, 200);
  assert.equal(me.json.email, email);
  assert.equal(me.json.founder_profile, null);
});

test("matches need a finished profile", async () => {
  assert.equal((await call("GET", "/funding/matches")).status, 401);
  const res = await call("GET", "/funding/matches", undefined, token);
  assert.equal(res.status, 409);
  assert.equal(res.json.error.code, "PROFILE_REQUIRED");
});

test("profile needs a token and valid fields", async () => {
  assert.equal((await call("PUT", "/me/profile", startupProfile)).status, 401);

  const noStage = await call("PUT", "/me/profile", { ...startupProfile, stage: undefined }, token);
  assert.equal(noStage.status, 400);
  assert.ok(noStage.json.error.fields.some((f: any) => f.path === "stage"));

  const badSector = await call("PUT", "/me/profile", { ...startupProfile, sector: "crypto" }, token);
  assert.equal(badSector.status, 400);

  const badItem = await call("PUT", "/me/profile", { ...startupProfile, already_have: ["made_up"] }, token);
  assert.equal(badItem.status, 400);
  assert.equal(badItem.json.error.code, "UNKNOWN_COMPLIANCE_ITEM");
});

test("startup profile saves and shows on /me", async () => {
  const saved = await call("PUT", "/me/profile", startupProfile, token);
  assert.equal(saved.status, 200);
  assert.equal(saved.json.stage, "mvp");
  assert.equal(saved.json.women_owned, null);

  const me = await call("GET", "/me", undefined, token);
  assert.equal(me.json.founder_profile.sector, "health");
  assert.deepEqual(me.json.founder_profile.already_have, ["brs_registration"]);
});

test("switching to the SME path requires SME fields and clears startup fields", async () => {
  const sme = {
    journey_type: "sme",
    business_status: "informal",
    description: "Nina salon Mombasa, nataka stock mpya",
    sector: "retail",
    county: "Mombasa",
    funding_amount_kes: 150_000,
    women_owned: true,
  };

  const missing = await call("PUT", "/me/profile", sme, token);
  assert.equal(missing.status, 400);

  // women_owned is an eligibility attribute, so she has to agree first.
  const smeFields = { months_trading: 18, monthly_revenue_band: "50k_to_200k", has_employees: false };
  const noConsent = await call("PUT", "/me/profile", { ...sme, ...smeFields }, token);
  assert.equal(noConsent.json.error.code, "CONSENT_REQUIRED");
  await call("POST", "/me/consents", { purpose: "eligibility_attributes", granted: true }, token);

  const saved = await call(
    "PUT",
    "/me/profile",
    { ...sme, months_trading: 18, monthly_revenue_band: "50k_to_200k", has_employees: false },
    token,
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.json.journey_type, "sme");
  assert.equal(saved.json.stage, null);
  assert.deepEqual(saved.json.instruments, []);
  assert.equal(saved.json.women_owned, true);
});

const names = (cards: any[]) => cards.map((c) => c.funder.name);

test("startup founder: matches are grouped with reasons and gaps", async () => {
  await call("PUT", "/me/profile", startupProfile, token);
  const res = await call("GET", "/funding/matches", undefined, token);
  assert.equal(res.status, 200);
  assert.equal(res.json.engine, "stand_in");

  const healthBridge = res.json.apply_now.find((c: any) => c.funder.name === "HealthBridge Accelerator (demo)");
  assert.equal(healthBridge.band, "strong");
  assert.ok(healthBridge.explanation.length > 0);
  // Founders see a band, never a number.
  assert.equal(healthBridge.score, undefined);

  // Fits, but she has registered the business and has no KRA PIN yet.
  const angels = res.json.apply_after.find((c: any) => c.funder.name === "Savanna Angels Network (demo)");
  assert.deepEqual(angels.gaps.map((g: any) => g.ref), ["kra_pin"]);

  const rift = res.json.not_for_you.find((c: any) => c.funder.name === "Rift Growth Fund (demo)");
  assert.ok(rift.reasons.some((r: any) => !r.fits));
  assert.deepEqual(rift.gaps, []);
  assert.equal(rift.band, null);
  assert.match(rift.explanation, /their minimum is KSh 10,000,000/);
});

test("SME founder: sees what she can apply for now, after fixing gaps, and not at all", async () => {
  const sme = {
    journey_type: "sme",
    business_status: "informal",
    description: "Nina salon Mombasa, nataka stock mpya",
    sector: "retail",
    county: "Mombasa",
    funding_amount_kes: 150_000,
    months_trading: 18,
    monthly_revenue_band: "50k_to_200k",
    has_employees: false,
  };
  await call("PUT", "/me/profile", sme, token);
  const res = await call("GET", "/funding/matches", undefined, token);

  assert.ok(names(res.json.apply_now).includes("Mtaani Starter Fund (demo)"));

  const bank = res.json.apply_after.find((c: any) => c.funder.name.startsWith("SME Working Capital Loan"));
  // She ticked business registration earlier, and switching path does not undo that.
  assert.deepEqual(bank.gaps.map((g: any) => g.ref), ["kra_pin", "business_bank_account"]);

  // She has not said whether the business is women-owned, so she is asked.
  const pwani = res.json.apply_after.find((c: any) => c.funder.name === "Pwani Women in Business Grant (demo)");
  assert.deepEqual(pwani.gaps.map((g: any) => [g.kind, g.ref]), [["unanswered", "women_owned"]]);

  assert.ok(names(res.json.not_for_you).includes("Rift Growth Fund (demo)"));

  // A fee is a risk factor on the card, not a reason to hide the funder.
  const fee = res.json.apply_now.find((c: any) => c.funder.name === "Global Founders Grant Award (demo)");
  assert.ok(fee.risk_factors.some((r: any) => r.code === "application_fee"));

  const total = res.json.apply_now.length + res.json.apply_after.length + res.json.not_for_you.length;
  assert.equal(total, (await call("GET", "/funders", undefined, token)).json.length);
});

test("extract suggests fields from a description and saves nothing", async () => {
  const res = await call("POST", "/me/profile/extract", { text: "Nina salon Mombasa, nataka 150k ya stock", language: "sw" }, token);
  assert.equal(res.status, 200);
  assert.equal(res.json.fields.county, "Mombasa");
  assert.equal(res.json.fields.funding_amount_kes, 150_000);
  assert.ok(res.json.unsure.includes("business_status"));
  assert.equal((await call("POST", "/me/profile/extract", { text: "short" }, token)).status, 400);
});

test("compliance items are public", async () => {
  const res = await call("GET", "/compliance/items");
  assert.ok(res.json.some((i: any) => i.id === "kra_pin"));
});

test("options and unknown routes", async () => {
  const options = await call("GET", "/meta/options");
  assert.ok(options.json.sectors.includes("health"));
  // Every list also comes with labels to show.
  assert.deepEqual(options.json.labels.sectors.slice(0, 2), [
    { id: "health", label: "Health" },
    { id: "agri", label: "Agriculture" },
  ]);
  assert.deepEqual(options.json.labels.business_statuses[2], { id: "registered_business_name", label: "Registered business name" });
  assert.equal((await call("GET", "/nope")).status, 404);
});
