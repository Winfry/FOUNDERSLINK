import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// An investor browsing her matches: search, filters and sort order.
// Runs against DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const fundName = `Discover Test Fund ${run}`;
const people = {
  grace: { role: "investor", full_name: "Grace Investor" },
  amina: { role: "founder", full_name: "Amina Health" },
  otieno: { role: "founder", full_name: "Otieno Dairy" },
  wanjiku: { role: "founder", full_name: "Wanjiku Salon" },
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

// Only the founders this test created, in the order the backend returned them.
const names = async (query = "") => {
  const res = await call("GET", `/investor/matches${query}`, "grace");
  return res.json.founders.filter((f: any) => Object.values(ids).includes(f.user_id)).map((f: any) => f.business_name);
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `disc-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, ...people[who], password_hash, approval_status: "approved" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
    await prisma.consent.create({ data: { user_id: user.id, purpose: "profile_visibility", granted: true, granted_at: new Date() } });
  }

  await call("PUT", "/me/funder", "grace", {
    name: fundName,
    kind: "angel",
    mandate_text: "We back health and agriculture businesses anywhere in Kenya.",
    journey_types: ["startup"],
    sectors: ["health", "agri"],
    instruments: ["equity", "loan"],
    ticket_min_kes: 100_000,
    ticket_max_kes: 5_000_000,
  });
  await call("PUT", "/me/profile", "amina", {
    journey_type: "startup", business_status: "limited_company", business_name: "Afya Booking",
    description: "A clinic booking app for county hospitals", sector: "health", county: "Nairobi",
    funding_amount_kes: 1_000_000, stage: "mvp",
  });
  await call("PUT", "/me/profile", "otieno", {
    journey_type: "startup", business_status: "registered_business_name", business_name: "Shamba Fresh",
    description: "A dairy that collects milk from small farms", sector: "agri", county: "Kisumu",
    funding_amount_kes: 300_000, stage: "early_revenue", has_employees: true,
  });
  await call("PUT", "/me/profile", "wanjiku", {
    journey_type: "startup", business_status: "informal", business_name: "Glow Salon",
    description: "A salon in Mombasa", sector: "retail", county: "Mombasa",
    funding_amount_kes: 150_000, stage: "idea", has_employees: false,
  });
});

after(async () => {
  await prisma.funder.deleteMany({ where: { name: fundName } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("she sees the businesses that fit her record, each with reasons written for her", async () => {
  assert.deepEqual((await names()).sort(), ["Afya Booking", "Shamba Fresh"]);

  const res = await call("GET", "/investor/matches", "grace");
  const afya = res.json.founders.find((f: any) => f.business_name === "Afya Booking");
  assert.deepEqual(afya.match_reasons, [
    "In a sector you fund: health",
    "At a stage you fund: mvp",
    "Based in Nairobi; you fund nationwide",
    "Asking for KSh 1,000,000, within your range",
    "Already meets everything you require",
  ]);
});

test("filters and search narrow her matches", async () => {
  assert.deepEqual(await names("?sector=agri"), ["Shamba Fresh"]);
  assert.deepEqual(await names("?county=Nairobi"), ["Afya Booking"]);
  assert.deepEqual(await names("?stage=mvp"), ["Afya Booking"]);
  assert.deepEqual(await names("?search=dairy"), ["Shamba Fresh"]);
  assert.deepEqual(await names("?search=AFYA"), ["Afya Booking"]);
  assert.deepEqual(await names("?sector=agri&county=Nairobi"), []);
});

test("searching cannot surface a business that does not fit her record", async () => {
  // The salon is in retail, which she does not fund.
  assert.deepEqual(await names("?search=salon"), []);
  assert.deepEqual(await names("?sector=retail"), []);
});

test("the list can be ordered by the amount asked for", async () => {
  assert.deepEqual(await names("?sort=amount_high"), ["Afya Booking", "Shamba Fresh"]);
  assert.deepEqual(await names("?sort=amount_low"), ["Shamba Fresh", "Afya Booking"]);
  assert.deepEqual(await names("?sort=newest"), ["Shamba Fresh", "Afya Booking"]);
  assert.equal((await call("GET", "/investor/matches?sort=random", "grace")).status, 400);
});

test("before approval the count follows the filters, and still names nobody", async () => {
  await prisma.user.update({ where: { id: ids.grace }, data: { approval_status: "in_review" } });
  const all = await call("GET", "/investor/matches", "grace");
  const agri = await call("GET", "/investor/matches?sector=agri", "grace");
  assert.ok(agri.json.count >= 1 && agri.json.count < all.json.count);
  assert.equal(agri.json.founders.length, agri.json.count);
  assert.ok(agri.json.founders.every((f: any) => f.anonymised && f.sector === "agri" && f.user_id === undefined));
  assert.ok(!JSON.stringify(agri.json).includes("Shamba Fresh"));
});

test("a founder who is not verified sees an investor's record without its name", async () => {
  await prisma.user.update({ where: { id: ids.grace }, data: { approval_status: "approved" } });
  const card = async () => {
    const matches = await call("GET", "/funding/matches", "amina");
    const all = [...matches.json.apply_now, ...matches.json.apply_after];
    return all.find((c: any) => c.headline === "Angel investor · health, agri · KSh 100,000 to KSh 5,000,000");
  };

  const named = await card();
  assert.equal(named.anonymised, false);
  assert.equal(named.funder.name, fundName);

  await prisma.user.update({ where: { id: ids.amina }, data: { approval_status: "draft" } });
  const hidden = await card();
  assert.equal(hidden.anonymised, true);
  assert.equal(hidden.funder.name, null);
  assert.equal(hidden.funder.mandate_text, null);
  assert.equal(hidden.investor, null);
  // What it funds, and how well it fits her, are still shown.
  assert.deepEqual(hidden.funder.sectors, ["health", "agri"]);
  assert.equal(hidden.band, named.band);
});
