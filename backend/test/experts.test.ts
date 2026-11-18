import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// The expert directory and office hours. Runs against DATABASE_URL and
// removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  wanjiru: { role: "expert", full_name: "Wanjiru Lawyer", approved: true },
  kamau: { role: "expert", full_name: "Kamau Accountant", approved: true },
  amina: { role: "founder", full_name: "Amina Founder", approved: true },
  achieng: { role: "founder", full_name: "Achieng Founder", approved: true },
  newcomer: { role: "founder", full_name: "Not Yet Approved", approved: false },
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

const mine = (list: any[]) => list.filter((e) => Object.values(ids).includes(e.user_id));
const ask = (who: Who, expert: Who, topic = "I need help registering my company.") =>
  call("POST", `/experts/${ids[expert]}/office-hours`, who, { topic });

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const { role, full_name, approved } = people[who];
    const email = `exp-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, role, full_name, password_hash, approval_status: approved ? "approved" : "draft" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
    await prisma.consent.create({ data: { user_id: user.id, purpose: "profile_visibility", granted: true, granted_at: new Date() } });
  }

  await call("PUT", "/me/expert-profile", "wanjiru", {
    profession: "lawyer",
    register_body: "LSK",
    bio: "Company registration and founder agreements for small businesses.",
    counties: ["Nairobi", "Mombasa"],
    services: ["Company registration", "Founders' agreement"],
    office_hours_per_month: 1,
  });
  await call("PUT", "/me/expert-profile", "kamau", {
    profession: "accountant",
    bio: "Bookkeeping and tax filing for retail and agribusiness.",
    sectors: ["retail", "agri"],
  });

  // An admin has checked Wanjiru against the professional register.
  const application = await prisma.vettingApplication.create({ data: { user_id: ids.wanjiru! } });
  await prisma.vettingCheck.create({
    data: { application_id: application.id, check_type: "professional_register", result: "pass", method: "lsk", checked_by: ids.wanjiru! },
  });
});

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("approved members can browse experts, and a register check shows as a badge", async () => {
  assert.equal((await call("GET", "/experts", "newcomer")).json.error.code, "APPROVAL_REQUIRED");

  const all = mine((await call("GET", "/experts", "amina")).json);
  assert.deepEqual(all.map((e: any) => e.full_name), ["Wanjiru Lawyer", "Kamau Accountant"]);

  const [wanjiru, kamau] = all;
  assert.equal(wanjiru.register_checked, true);
  assert.deepEqual(wanjiru.services, ["Company registration", "Founders' agreement"]);
  assert.deepEqual(wanjiru.office_hours, { per_month: 1, left_this_month: 1 });
  // How each was checked, for members to read in words.
  assert.deepEqual({ ...wanjiru.verification, checkedOn: typeof wanjiru.verification.checkedOn }, {
    trust: "licensed",
    label: "Licensed",
    by: "LSK",
    checkedOn: "string",
    meaning: "On the official register, checked there by FoundersLink.",
  });
  // Nobody has checked his register, so no date is claimed.
  assert.equal(kamau.verification.by, "ICPAK");
  assert.equal(kamau.verification.checkedOn, null);
  // He says nothing about a register, and nobody has checked one.
  assert.equal(kamau.register_checked, false);
  assert.equal(kamau.office_hours.left_this_month, 0);
});

test("the directory filters by profession, sector and county", async () => {
  const names = async (query: string) => mine((await call("GET", `/experts?${query}`, "amina")).json).map((e: any) => e.full_name);

  assert.deepEqual(await names("profession=accountant"), ["Kamau Accountant"]);
  // Wanjiru lists no sectors, so she covers all of them. Kamau covers retail.
  assert.deepEqual(await names("sector=retail"), ["Wanjiru Lawyer", "Kamau Accountant"]);
  assert.deepEqual(await names("sector=health"), ["Wanjiru Lawyer"]);
  assert.deepEqual(await names("county=Kisumu"), ["Kamau Accountant"]);
  assert.equal((await call("GET", "/experts?profession=wizard", "amina")).status, 400);
});

test("an expert takes on only as many sessions as she offered this month", async () => {
  assert.equal((await ask("amina", "kamau")).json.error.code, "NO_SLOTS");

  const first = await ask("amina", "wanjiru");
  assert.equal(first.status, 201);
  assert.equal((await ask("amina", "wanjiru")).json.error.code, "ALREADY_REQUESTED");
  const second = await ask("achieng", "wanjiru", "I need a founders' agreement reviewed.");

  // Only the expert answers her requests.
  assert.equal((await call("PATCH", `/office-hours/${first.json.id}`, "amina", { status: "accepted" })).status, 404);
  assert.equal((await call("PATCH", `/office-hours/${first.json.id}`, "wanjiru", { status: "done" })).json.error.code, "WRONG_STATUS");

  assert.equal((await call("PATCH", `/office-hours/${first.json.id}`, "wanjiru", { status: "accepted" })).json.status, "accepted");
  // Her one session this month is taken.
  assert.equal((await call("PATCH", `/office-hours/${second.json.id}`, "wanjiru", { status: "accepted" })).json.error.code, "NO_SLOTS");
  assert.equal((await ask("achieng", "kamau")).json.error.code, "NO_SLOTS");
  assert.equal(mine((await call("GET", "/experts", "achieng")).json)[1].office_hours.left_this_month, 0);
});

test("accepting a session connects the two, so they can talk", async () => {
  const connections = await call("GET", "/connections", "amina");
  assert.deepEqual(connections.json.map((c: any) => [c.with.full_name, c.status]), [["Wanjiru Lawyer", "accepted"]]);
  assert.equal((await call("POST", "/conversations", "amina", { user_id: ids.wanjiru })).status, 201);

  const sessions = await call("GET", "/me/office-hours", "wanjiru");
  assert.deepEqual(
    sessions.json.map((s: any) => [s.with.full_name, s.role, s.status]).sort(),
    [
      ["Achieng Founder", "expert", "requested"],
      ["Amina Founder", "expert", "accepted"],
    ],
  );
});

test("a finished session counts towards how many people she has helped", async () => {
  const session = (await call("GET", "/me/office-hours", "amina")).json[0];
  assert.equal((await call("PATCH", `/office-hours/${session.id}`, "wanjiru", { status: "done" })).json.status, "done");
  assert.equal(mine((await call("GET", "/experts", "achieng")).json).find((e: any) => e.full_name === "Wanjiru Lawyer").helped, 1);
});

test("when a compliance answer says to get an expert, an approved member is shown some", async () => {
  const question = { question: "Do I need a KRA PIN for my business?" };

  const approved = await call("POST", "/compliance/ask", "amina", question);
  assert.equal(approved.json.suggest_expert, true);
  assert.ok(mine(approved.json.experts).length > 0);

  // Someone not yet approved learns that experts exist, not who they are.
  const waiting = await call("POST", "/compliance/ask", "newcomer", question);
  assert.deepEqual(waiting.json.experts, []);
  assert.ok(waiting.json.experts_available > 0);
});

test("an investor new to farming asks in her own words and gets an advocate who knows land law", async () => {
  // A land lawyer for agriculture, and an investor to ask.
  const extra = async (key: string, role: "expert" | "investor", full_name: string) => {
    const email = `exp-${key}-${run}@example.com`;
    const password_hash = await bcrypt.hash(password, 4);
    const user = await prisma.user.create({ data: { email, role, full_name, password_hash, approval_status: "approved" } });
    ids[key] = user.id;
    tokens[key] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
    await prisma.consent.create({ data: { user_id: user.id, purpose: "profile_visibility", granted: true, granted_at: new Date() } });
  };
  await extra("kiprono", "expert", "Kiprono Land Advocate");
  await extra("grace", "investor", "Grace Investor");
  const saved = await call("PUT", "/me/expert-profile", "kiprono" as Who, {
    profession: "lawyer",
    register_body: "LSK",
    bio: "Land searches, agricultural leases and title transfers.",
    sectors: ["agri"],
    counties: ["Nakuru", "Uasin Gishu"],
    practice_areas: ["land_property", "contracts"],
    office_hours_per_month: 2,
  });
  assert.deepEqual(saved.json.practice_areas, ["land_property", "contracts"]);
  assert.equal((await call("PUT", "/me/expert-profile", "kiprono" as Who, { profession: "lawyer", bio: "Land law and more.", practice_areas: ["wizardry"] })).status, 400);

  // The directory filters by practice area.
  const land = mine((await call("GET", "/experts?practice_area=land_property", "amina")).json).map((e: any) => e.full_name);
  assert.deepEqual(land, ["Kiprono Land Advocate"]);

  // The question, as she would type it.
  const res = await call("POST", "/experts/find", "grace" as Who, {
    question: "I would love to invest in a founder in agriculture but I do not know the laws. Which advocates know land law?",
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.understood, { profession: "lawyer", practice_area: "land_property", practice_area_label: "Land and property law", sector: "agri", county: null, budget_kes: null });
  assert.match(res.json.explanation, /land is often the biggest risk/);
  assert.match(res.json.note, /not legal, tax or financial advice/);
  const found = mine(res.json.experts);
  assert.equal(found[0].full_name, "Kiprono Land Advocate");
  assert.deepEqual(found[0].reasons, ["Land and property law", "Works with agriculture businesses"]);
  // Only lawyers: she asked for an advocate.
  assert.ok(found.every((e: any) => e.profession === "lawyer"));

  // Not yet approved members cannot search.
  assert.equal((await call("POST", "/experts/find", "newcomer", { question: "land law for my farm" })).json.error.code, "APPROVAL_REQUIRED");
});

// A licence date that is always in the future, whenever the tests run.
const nextYearEnd = `${new Date().getUTCFullYear() + 1}-12-31`;

test("a profession offers only its own practice areas, and the register is the profession's own", async () => {
  // A mentor cannot offer legal work.
  const mentor = await call("PUT", "/me/expert-profile", "kamau", { profession: "mentor", bio: "I help founders pitch.", practice_areas: ["land_property"] });
  assert.equal(mentor.status, 400);
  assert.equal(mentor.json.error.code, "AREA_NOT_ALLOWED");

  // A valuer is checked against the Valuers Registration Board, whatever she sends.
  const valuer = await call("PUT", "/me/expert-profile", "kamau", {
    profession: "valuer",
    register_body: "Something else",
    register_number: "VRB/123",
    licence_expires_at: nextYearEnd,
    bio: "Valuing farmland and equipment.",
    practice_areas: ["valuation"],
  });
  assert.equal(valuer.status, 200);
  assert.equal(valuer.json.register_body, "VRB");
  assert.equal(valuer.json.country, "KE");
  assert.equal(new Date(valuer.json.licence_expires_at).toISOString().slice(0, 10), nextYearEnd);
});

test("preparing to raise investment: the whole path, each step with a verified expert, from her side", async () => {
  const res = await call("POST", "/experts/find", "amina", { question: "I'm preparing to raise investment for my farm. Who will I need?" });
  assert.equal(res.status, 200);
  assert.match(res.json.explanation, /^Raising investment usually goes in steps/);
  const plan = res.json.plan as any[];
  assert.deepEqual(
    plan.map((p) => [p.need, p.step]),
    [
      ["mentor", "Exploring"],
      ["valuer", "Exploring"],
      ["accountant", "Due diligence"],
      ["company_advocate", "Due diligence"],
      ["deal_advocate", "Terms agreed"],
      ["tax", "Terms agreed"],
      ["secretary_shares", "Documents"],
      ["land_advocate", "Due diligence"],
    ],
  );
  // Said from the founder's side.
  assert.equal(plan.find((p) => p.need === "accountant").why, "To get your books and bank statements ready before the investor checks them.");
  // Each step's expert offers what that step needs: land law for the farm, a valuation for the price.
  // (Other experts may be in the database, so this checks what they offer, not who they are.)
  assert.ok(plan.find((p) => p.need === "land_advocate").expert.practice_areas.includes("land_property"));
  assert.ok(plan.find((p) => p.need === "valuer").expert.practice_areas.includes("valuation"));
  // A step nobody offers says so (null) rather than suggesting the wrong person.
  const areaOf: Record<string, string> = { mentor: "fundraising", valuer: "valuation", accountant: "audit", company_advocate: "company", deal_advocate: "investment_deals", tax: "tax", secretary_shares: "governance", land_advocate: "land_property" };
  for (const p of plan) if (p.expert) assert.ok(p.expert.practice_areas.includes(areaOf[p.need]), p.need);
  // An ordinary question has no plan.
  assert.equal((await call("POST", "/experts/find", "amina", { question: "Which advocates know land law?" })).json.plan, null);
});

test("an expert's rate card is checked, shown, and used to find someone within a budget", async () => {
  const profile = (rate_card: unknown) =>
    call("PUT", "/me/expert-profile", "kiprono" as Who, {
      profession: "lawyer",
      register_body: "LSK",
      bio: "Land searches, agricultural leases and title transfers.",
      sectors: ["agri"],
      counties: ["Nakuru", "Uasin Gishu"],
      practice_areas: ["land_property", "contracts"],
      office_hours_per_month: 2,
      rate_card,
    });

  // A price for something her profession may not offer is refused, and so is a missing price.
  assert.equal((await profile([{ service: "Tax filing", area: "tax", unit: "fixed", price_kes: 5000 }])).json.error.code, "RATE_CARD_INVALID");
  assert.equal((await profile([{ service: "Land search", area: "land_property", unit: "fixed", price_kes: null }])).json.error.code, "RATE_CARD_INVALID");

  const saved = await profile([
    { service: "First consultation (30 minutes)", area: "land_property", unit: "free", price_kes: 999 },
    { service: "Land search and title report", area: "land_property", unit: "fixed", price_kes: 8000 },
    { service: "Contract review", area: "contracts", unit: "hour", price_kes: 3000 },
  ]);
  assert.equal(saved.status, 200);
  // A free line never carries a price.
  assert.equal(saved.json.rate_card[0].price_kes, null);

  // Members see it on her card.
  const card = mine((await call("GET", "/experts?practice_area=land_property", "amina")).json).find((e: any) => e.full_name === "Kiprono Land Advocate");
  assert.deepEqual(card.rate_card.map((i: any) => [i.service, i.price_kes]), [
    ["First consultation (30 minutes)", null],
    ["Land search and title report", 8000],
    ["Contract review", 3000],
  ]);

  // Asked within a budget: she fits, and the answer says so.
  const res = await call("POST", "/experts/find", "grace" as Who, { question: "Who can do a land search for a farm for under KES 10,000?" });
  assert.equal(res.json.understood.budget_kes, 10000);
  const her = mine(res.json.experts).find((e: any) => e.full_name === "Kiprono Land Advocate");
  assert.ok(her.reasons.includes("Land search and title report: KES 8,000, within your budget"));
});
