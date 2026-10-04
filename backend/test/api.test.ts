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
  // 4 of the 10 fields that count are filled in: description, amount, stage and instruments.
  assert.equal(saved.json.profile_completeness, 40);

  const fuller = await call("PUT", "/me/profile", { ...startupProfile, business_name: "Afya Booking", use_of_funds: "Hire two engineers", year_started: 2024, website: "https://afya.example.com", social_links: ["https://x.com/afya"], has_employees: true, handles_personal_data: true }, token);
  assert.equal(fuller.json.profile_completeness, 100);
  assert.equal(fuller.json.year_started, 2024);
  assert.equal((await call("PUT", "/me/profile", { ...startupProfile, website: "not a link" }, token)).status, 400);
  await call("PUT", "/me/profile", startupProfile, token);

  const me = await call("GET", "/me", undefined, token);
  assert.equal(me.json.founder_profile.sector, "health");
  assert.deepEqual(me.json.founder_profile.already_have, ["brs_registration"]);
});

test("every founder is a startup founder for now", async () => {
  // journey_type can be left out, and the small-business path is refused.
  const { journey_type: _path, ...withoutPath } = startupProfile;
  const saved = await call("PUT", "/me/profile", withoutPath, token);
  assert.equal(saved.json.journey_type, "startup");

  const sme = await call("PUT", "/me/profile", { ...startupProfile, journey_type: "sme" }, token);
  assert.equal(sme.status, 400);
  assert.ok(sme.json.error.fields.some((f: any) => f.path === "journey_type"));
});

test("eligibility attributes need her consent", async () => {
  const withFlag = { ...startupProfile, women_owned: true };
  assert.equal((await call("PUT", "/me/profile", withFlag, token)).json.error.code, "CONSENT_REQUIRED");
  await call("POST", "/me/consents", { purpose: "eligibility_attributes", granted: true }, token);
  assert.equal((await call("PUT", "/me/profile", withFlag, token)).json.women_owned, true);
});

test("investor matches come in three lists, with reasons and gaps", async () => {
  await call("PUT", "/me/profile", startupProfile, token);
  const res = await call("GET", "/funding/matches", undefined, token);
  assert.equal(res.status, 200);
  assert.equal(res.json.engine, "stand_in");

  // Pitch: fits, and she already has the registration they require.
  const savanna = res.json.apply_now.find((c: any) => c.funder.name === "Savanna Angels Network (demo)");
  assert.equal(savanna.band, "strong");
  assert.ok(savanna.explanation.length > 0);
  // Founders see a band, never a number.
  assert.equal(savanna.score, undefined);
  assert.ok(savanna.risk_factors.some((r: any) => r.code === "demo_data"));

  // Pitch after: fits, but she has no KRA PIN yet.
  const healthBridge = res.json.apply_after.find((c: any) => c.funder.name === "HealthBridge Accelerator (demo)");
  assert.deepEqual(healthBridge.gaps.map((g: any) => g.ref), ["kra_pin"]);

  // Don't pitch: their minimum is far above what she needs.
  const rift = res.json.not_for_you.find((c: any) => c.funder.name === "Rift Growth Fund (demo)");
  assert.ok(rift.reasons.some((r: any) => !r.fits));
  assert.deepEqual(rift.gaps, []);
  assert.equal(rift.band, null);
  assert.match(rift.explanation, /their minimum is KSh 10,000,000/);

  const total = res.json.apply_now.length + res.json.apply_after.length + res.json.not_for_you.length;
  assert.equal(total, (await call("GET", "/funders", undefined, token)).json.length);
});

test("only investors are listed: no grants, government funds, banks or SACCOs", async () => {
  const funders = (await call("GET", "/funders", undefined, token)).json;
  assert.ok(funders.every((f: any) => ["angel", "vc", "accelerator"].includes(f.kind)));
  const options = (await call("GET", "/meta/options")).json;
  assert.deepEqual(options.funder_kinds, ["angel", "vc", "accelerator"]);
  assert.deepEqual(options.journey_types, ["startup"]);
});

test("extract suggests fields from a description and saves nothing", async () => {
  const res = await call("POST", "/me/profile/extract", { text: "Nina salon Mombasa, nataka 150k ya stock", language: "sw" }, token);
  assert.equal(res.status, 200);
  assert.equal(res.json.fields.county, "Mombasa");
  assert.equal(res.json.fields.funding_amount_kes, 150_000);
  assert.ok(res.json.unsure.includes("business_status"));
  // The only path there is.
  assert.equal(res.json.fields.journey_type, "startup");
  assert.equal((await call("POST", "/me/profile/extract", { text: "short" }, token)).status, 400);
});

test("compliance items are public, and show only what the form needs", async () => {
  const res = await call("GET", "/compliance/items");
  const kra = res.json.find((i: any) => i.id === "kra_pin");
  assert.deepEqual(Object.keys(kra).sort(), ["id", "institution", "title", "why"]);
});

test("a request that is too large is refused as too large", async () => {
  const res = await call("POST", "/auth/login", { email: "a@example.com", password: "x".repeat(200_000) });
  assert.equal(res.status, 413);
  assert.equal(res.json.error.code, "PAYLOAD_TOO_LARGE");
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
