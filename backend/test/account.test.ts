import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Consent, data export and account deletion. Runs against DATABASE_URL
// (with the demo data loaded) and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const fundName = `Consent Test Angels ${run}`;
const people = {
  founder: { role: "founder", full_name: "Amina Founder" },
  investor: { role: "investor", full_name: "Grace Investor" },
  friend: { role: "founder", full_name: "Achieng Friend" },
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

const consent = (who: Who, purpose: string, granted: boolean) => call("POST", "/me/consents", who, { purpose, granted });

const profile = {
  journey_type: "startup",
  business_status: "limited_company",
  business_name: `Afya Booking ${run}`,
  description: "A clinic booking app for county hospitals",
  sector: "health",
  county: "Nairobi",
  funding_amount_kes: 1_000_000,
  stage: "mvp",
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `acct-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, ...people[who], password_hash, approval_status: "approved" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }

  await call("PUT", "/me/profile", "founder", profile);
  await call("PUT", "/me/funder", "investor", {
    name: fundName,
    kind: "angel",
    mandate_text: "We back early Kenyan health startups with a working product.",
    journey_types: ["startup"],
    sectors: ["health"],
    stages: ["mvp"],
    instruments: ["equity"],
    ticket_min_kes: 500_000,
    ticket_max_kes: 5_000_000,
  });
});

after(async () => {
  await prisma.funder.deleteMany({ where: { name: fundName } });
  await prisma.deal.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
  await prisma.circle.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("nothing is agreed to until she says so", async () => {
  const list = await call("GET", "/me/consents", "founder");
  assert.deepEqual(
    list.json.map((c: any) => [c.purpose, c.granted]),
    [
      ["profile_visibility", false],
      ["ai_matching", false],
      ["eligibility_attributes", false],
      ["contact", false],
      ["document_processing", false],
    ],
  );
  assert.equal((await consent("founder", "marketing", true)).status, 400);
});

test("a founder is invisible to other members until she agrees to be seen", async () => {
  const seenBy = async () => (await call("GET", "/investor/matches", "investor")).json.founders.some((f: any) => f.user_id === ids.founder);

  assert.equal(await seenBy(), false);
  assert.equal((await call("GET", `/profiles/${ids.founder}`, "investor")).status, 404);

  const granted = await consent("founder", "profile_visibility", true);
  assert.ok(granted.json.find((c: any) => c.purpose === "profile_visibility").granted_at);
  assert.equal(await seenBy(), true);
  assert.equal((await call("GET", `/profiles/${ids.founder}`, "investor")).status, 200);

  // Withdrawing takes effect at once, and the withdrawal is recorded.
  const withdrawn = await consent("founder", "profile_visibility", false);
  assert.ok(withdrawn.json.find((c: any) => c.purpose === "profile_visibility").withdrawn_at);
  assert.equal(await seenBy(), false);
});

test("funding matches and profile extraction are for founders", async () => {
  assert.equal((await call("GET", "/funding/matches", "investor")).status, 403);
  assert.equal((await call("POST", "/me/profile/extract", "investor", { text: "We fund health startups in Nairobi" })).status, 403);
});

test("an investor's record is shown either way, but she is named only if she agrees", async () => {
  const card = async () => {
    const matches = await call("GET", "/funding/matches", "founder");
    return [...matches.json.apply_now, ...matches.json.apply_after].find((c: any) => c.funder.name === fundName);
  };

  assert.equal((await card()).investor, null);
  await consent("investor", "profile_visibility", true);
  assert.equal((await card()).investor.full_name, "Grace Investor");
});

test("eligibility attributes need consent to store, and are removed when it is withdrawn", async () => {
  const withFlag = { ...profile, women_owned: true };
  assert.equal((await call("PUT", "/me/profile", "founder", withFlag)).json.error.code, "CONSENT_REQUIRED");
  // A profile without them needs no such consent.
  assert.equal((await call("PUT", "/me/profile", "founder", profile)).status, 200);

  await consent("founder", "eligibility_attributes", true);
  assert.equal((await call("PUT", "/me/profile", "founder", withFlag)).json.women_owned, true);

  await consent("founder", "eligibility_attributes", false);
  assert.equal((await call("GET", "/me", "founder")).json.founder_profile.women_owned, null);
});

test("the export has everything of hers and nothing of anyone else's", async () => {
  await call("PATCH", "/compliance/kra_pin/status", "founder", { status: "complete" });
  const asked = await call("POST", "/connections", "founder", { user_id: ids.investor, message: "Hello" });
  await call("PATCH", `/connections/${asked.json.id}`, "investor", { status: "accepted" });
  const chat = await call("POST", "/conversations", "founder", { user_id: ids.investor });
  await call("POST", `/conversations/${chat.json.id}/messages`, "founder", { body: "My message" });
  await call("POST", `/conversations/${chat.json.id}/messages`, "investor", { body: "Her reply" });

  assert.equal((await call("GET", "/me/export")).status, 401);
  const res = await call("GET", "/me/export", "founder");
  const data = res.json;

  assert.equal(data.account.full_name, "Amina Founder");
  assert.equal(data.account.founder_profile.business_name, `Afya Booking ${run}`);
  assert.equal(data.consents.length, 5);
  assert.deepEqual(data.compliance.statuses.map((s: any) => [s.item_id, s.status]), [["kra_pin", "complete"]]);
  assert.equal(data.connections.length, 1);
  assert.deepEqual(data.messages_sent.map((m: any) => m.body), ["My message"]);

  const text = JSON.stringify(data);
  assert.ok(!text.includes("password_hash"));
  assert.ok(!text.includes("Her reply"));
  assert.ok(!text.includes(`acct-investor-${run}@example.com`));
});

test("deleting an account needs the password, and waits for what others depend on", async () => {
  assert.equal((await call("DELETE", "/me", "founder", { password: "wrong-password" })).status, 401);

  // A circle she organises that still has another member.
  const circle = await call("POST", "/circles", "founder", { name: `Shared Circle ${run}`, type: "learning" });
  const invite = await call("POST", `/circles/${circle.json.id}/invites`, "founder");
  await call("POST", "/circles/join", "friend", { token: invite.json.token });
  assert.equal((await call("DELETE", "/me", "founder", { password })).json.error.code, "ORGANISES_CIRCLES");
  await call("DELETE", `/circles/${circle.json.id}/members/${ids.friend}`, "founder");

  // A deal still in progress.
  const deal = await call("POST", "/deals", "founder", { type: "investment", title: `Open round ${run}`, with_user_id: ids.investor });
  assert.equal((await call("DELETE", "/me", "founder", { password })).json.error.code, "DEALS_IN_PROGRESS");
  await call("POST", `/deals/${deal.json.id}/status`, "founder", { status: "declined", reason: "Closing my account." });

  const gone = await call("DELETE", "/me", "founder", { password });
  assert.deepEqual(gone.json, { deleted: true });
});

test("after deletion she cannot sign in, and what was hers is gone", async () => {
  const login = await call("POST", "/auth/login", undefined, { email: `acct-founder-${run}@example.com`, password });
  assert.equal(login.status, 401);
  // Her old token no longer works either.
  assert.equal((await call("GET", "/me", "founder")).status, 401);

  assert.equal(await prisma.founderProfile.count({ where: { user_id: ids.founder } }), 0);
  assert.equal(await prisma.consent.count({ where: { user_id: ids.founder } }), 0);
  assert.equal(await prisma.complianceStatus.count({ where: { entity_id: ids.founder } }), 0);
  assert.equal(await prisma.message.count({ where: { sender_id: ids.founder } }), 0);
  assert.equal(await prisma.circle.count({ where: { name: `Shared Circle ${run}` } }), 0);

  // The investor's side is untouched.
  assert.equal((await call("GET", "/me", "investor")).json.full_name, "Grace Investor");
  assert.equal(await prisma.message.count({ where: { sender_id: ids.investor } }), 1);
});
