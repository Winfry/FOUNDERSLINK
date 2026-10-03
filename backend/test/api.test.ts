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
  token = res.json.token;
});

test("register ignores a role sent by the client", async () => {
  const other = `role-${email}`;
  const res = await call("POST", "/auth/register", {
    email: other,
    password,
    full_name: "Sneaky",
    role: "investor",
  });
  assert.equal(res.json.user.role, "founder");
  await prisma.user.deleteMany({ where: { email: other } });
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

test("profile needs a token and valid fields", async () => {
  assert.equal((await call("PUT", "/me/profile", startupProfile)).status, 401);

  const noStage = await call("PUT", "/me/profile", { ...startupProfile, stage: undefined }, token);
  assert.equal(noStage.status, 400);
  assert.ok(noStage.json.error.fields.some((f: any) => f.path === "stage"));

  const badSector = await call("PUT", "/me/profile", { ...startupProfile, sector: "crypto" }, token);
  assert.equal(badSector.status, 400);
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

test("options and unknown routes", async () => {
  const options = await call("GET", "/meta/options");
  assert.ok(options.json.sectors.includes("health"));
  assert.equal((await call("GET", "/nope")).status, 404);
});
