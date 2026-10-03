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
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

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
