import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// An investor asking to join a founder: the request carries her pitch,
// can be withdrawn, and can be declined with a reason. Runs against
// DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const fundName = `Join Test Fund ${run}`;
const people = {
  grace: { role: "investor", full_name: "Grace Investor" },
  amina: { role: "founder", full_name: "Amina Founder" },
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

const request = () =>
  call("POST", "/connections", "grace", {
    user_id: ids.amina,
    pitch: "I have backed two clinics in Kiambu and can open hospital partnerships.",
    vision: "Bookings in every county hospital within three years.",
    offer: "Introductions to county health officers.",
    proposed_amount_kes: 1_500_000,
  });

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `join-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, ...people[who], password_hash, approval_status: "approved" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }
  await call("PUT", "/me/investor-profile", "grace", { organisation_name: "Kiambu Health Angels" });
  await call("PUT", "/me/funder", "grace", {
    name: fundName, kind: "angel", mandate_text: "Early health and agriculture businesses.",
    journey_types: ["startup"], sectors: ["health", "agri"], instruments: ["equity"],
    ticket_min_kes: 500_000, ticket_max_kes: 5_000_000,
  });
});

after(async () => {
  await prisma.funder.deleteMany({ where: { name: fundName } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("the founder sees who is asking, what she invests in, and her pitch", async () => {
  assert.equal((await request()).status, 201);

  const [received] = (await call("GET", "/connections", "amina")).json;
  assert.equal(received.direction, "received");
  assert.deepEqual(received.with, {
    id: ids.grace,
    full_name: "Grace Investor",
    role: "investor",
    organisation_name: "Kiambu Health Angels",
    focus_areas: ["health", "agri"],
  });
  assert.match(received.pitch, /backed two clinics/);
  assert.match(received.vision, /every county hospital/);
  assert.equal(received.proposed_amount_kes, 1_500_000);
});

test("the investor can take an unanswered request back, and ask again later", async () => {
  const [sent] = (await call("GET", "/connections", "grace")).json;
  // Only the person who asked can withdraw it.
  assert.equal((await call("DELETE", `/connections/${sent.id}`, "amina")).status, 404);

  assert.deepEqual((await call("DELETE", `/connections/${sent.id}`, "grace")).json, { id: sent.id, status: "withdrawn" });
  assert.equal((await call("PATCH", `/connections/${sent.id}`, "amina", { status: "accepted" })).status, 404);

  assert.equal((await request()).status, 201);
  assert.equal((await call("GET", "/connections", "grace")).json.length, 1);
});

test("a decline can carry a reason, the investor is told, and she cannot ask again", async () => {
  const [received] = (await call("GET", "/connections", "amina")).json;
  const declined = await call("PATCH", `/connections/${received.id}`, "amina", {
    status: "declined",
    reason: "We are not raising until next year.",
  });
  assert.equal(declined.json.status, "declined");

  const [sent] = (await call("GET", "/connections", "grace")).json;
  assert.equal(sent.decline_reason, "We are not raising until next year.");
  const told = (await call("GET", "/notifications", "grace")).json.notifications[0];
  assert.equal(told.type, "connection_declined");
  assert.equal(told.body, "Amina Founder declined your request: We are not raising until next year.");

  assert.equal((await request()).json.error.code, "ALREADY_REQUESTED");
  assert.equal((await call("DELETE", `/connections/${sent.id}`, "grace")).status, 404);
});
