import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Founder Circles: a money circle among people who know each other, and
// a learning circle anyone can find. Runs against DATABASE_URL (with the
// demo data loaded) and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  wanjiku: { full_name: "Wanjiku Organiser", approved: true },
  achieng: { full_name: "Achieng Friend", approved: true },
  mumbi: { full_name: "Mumbi Friend", approved: true },
  stranger: { full_name: "Otieno Stranger", approved: true },
  newcomer: { full_name: "Not Yet Approved", approved: false },
} as const;
type Who = keyof typeof people;

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let circle = "";
let learning = "";
let goal = "";

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

const invite = async (circleId: string, who: Who = "wanjiku") =>
  (await call("POST", `/circles/${circleId}/invites`, who)).json;
const pay = (who: Who, body: object) => call("POST", `/circles/${circle}/contributions`, who, body);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `circle-${who}-${run}@example.com`;
    const { full_name, approved } = people[who];
    const user = await prisma.user.create({
      data: { email, full_name, role: "founder", password_hash, approval_status: approved ? "approved" : "draft" },
    });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }

  await call("PUT", "/me/profile", "stranger", {
    journey_type: "sme",
    business_status: "informal",
    description: "A salon in Mombasa that wants to grow",
    sector: "retail",
    county: "Mombasa",
    months_trading: 12,
    monthly_revenue_band: "under_50k",
    has_employees: false,
  });
});

after(async () => {
  await prisma.deal.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
  await prisma.circle.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("a money circle cannot be open to strangers, and a learning circle has no contributions", async () => {
  const base = { name: `Mama Mboga Savers ${run}`, type: "money", contribution_amount_kes: 2000, contribution_frequency: "monthly" };

  assert.equal((await call("POST", "/circles", "newcomer", base)).json.error.code, "APPROVAL_REQUIRED");
  assert.equal((await call("POST", "/circles", "wanjiku", { ...base, discoverable: true })).status, 400);
  assert.equal((await call("POST", "/circles", "wanjiku", { ...base, type: "learning" })).status, 400);

  const made = await call("POST", "/circles", "wanjiku", base);
  assert.equal(made.status, 201);
  circle = made.json.id;
  assert.equal(made.json.my_role, "organiser");
  assert.deepEqual(made.json.contribution, { amount_kes: 2000, frequency: "monthly" });
  assert.match(made.json.notice, /does not hold or move money/);
});

test("the only way into a money circle is a single-use invite from its organiser", async () => {
  assert.equal((await call("GET", `/circles/${circle}`, "achieng")).status, 404);
  assert.equal((await call("POST", `/circles/${circle}/join`, "achieng")).status, 404);
  assert.deepEqual((await call("GET", "/circles/suggested", "achieng")).json, []);

  const link = await invite(circle);
  assert.equal(link.single_use, true);
  assert.equal(link.path, `/circles/join/${link.token}`);

  const preview = await call("GET", `/circles/invites/${link.token}`, "achieng");
  assert.deepEqual(preview.json, { name: `Mama Mboga Savers ${run}`, description: null, type: "money", members: 1 });

  const joined = await call("POST", "/circles/join", "achieng", { token: link.token });
  assert.equal(joined.json.my_role, "member");

  // The link was for one person. Forwarding it lets nobody else in.
  assert.equal((await call("POST", "/circles/join", "stranger", { token: link.token })).status, 404);
  assert.equal((await call("POST", "/circles/join", "achieng", { token: (await invite(circle)).token })).status, 409);

  // Only the organiser hands out invites.
  assert.equal((await call("POST", `/circles/${circle}/invites`, "achieng")).status, 403);

  await call("POST", "/circles/join", "mumbi", { token: (await invite(circle)).token });
  assert.equal((await call("GET", `/circles/${circle}`, "mumbi")).json.members.length, 3);
});

test("the treasurer records contributions, and a receipt cannot be counted twice", async () => {
  goal = (await call("POST", `/circles/${circle}/goals`, "wanjiku", { title: "Bulk-buy stock", target_amount_kes: 30_000 })).json.id;
  assert.equal((await call("POST", `/circles/${circle}/goals`, "achieng", { title: "My own goal" })).status, 403);

  const payment = { member_id: ids.mumbi, amount_kes: 2000, paid_at: yesterday, goal_id: goal, mpesa_receipt: "sj12ab34cd" };
  assert.equal((await pay("achieng", payment)).status, 403);

  await call("PATCH", `/circles/${circle}/members/${ids.achieng}`, "wanjiku", { role: "treasurer" });
  const recorded = await pay("achieng", payment);
  assert.equal(recorded.status, 201);
  assert.equal(recorded.json.source, "manual");
  assert.equal(recorded.json.mpesa_receipt, "SJ12AB34CD");

  assert.equal((await pay("wanjiku", payment)).json.error.code, "RECEIPT_ALREADY_RECORDED");
  assert.equal((await pay("achieng", { ...payment, mpesa_receipt: undefined, member_id: ids.stranger })).json.error.code, "NOT_A_MEMBER");
  assert.equal((await pay("achieng", { ...payment, mpesa_receipt: undefined, paid_at: "2030-01-01" })).json.error.code, "FUTURE_DATE");

  await pay("achieng", { member_id: ids.wanjiku, amount_kes: 500, paid_at: yesterday });
});

test("every member sees who has paid, who still owes this period, and progress on each goal", async () => {
  const view = (await call("GET", `/circles/${circle}`, "mumbi")).json;
  assert.equal(view.total_contributed_kes, 2500);

  const row = (name: string) => view.members.find((m: any) => m.full_name === name);
  // The check uses yesterday, which is last period on the first of a month.
  const firstOfMonth = new Date().getUTCDate() === 1;
  if (!firstOfMonth) {
    assert.deepEqual(row("Mumbi Friend").this_period, { paid_kes: 2000, due_kes: 0 });
    assert.deepEqual(row("Wanjiku Organiser").this_period, { paid_kes: 500, due_kes: 1500 });
  }
  assert.deepEqual(row("Achieng Friend").this_period, { paid_kes: 0, due_kes: 2000 });
  assert.equal(row("Achieng Friend").role, "treasurer");

  assert.equal(view.goals[0].raised_kes, 2000);
  assert.equal(view.goals[0].progress_text, "KSh 2,000 of KSh 30,000");

  const history = await call("GET", `/circles/${circle}/contributions`, "mumbi");
  assert.equal(history.json.length, 2);
  assert.equal(history.json.find((p: any) => p.goal)?.goal.title, "Bulk-buy stock");
  assert.equal((await call("GET", `/circles/${circle}/contributions`, "stranger")).status, 404);
});

test("meeting minutes, notes and votes are kept with the circle", async () => {
  const minutes = await call("POST", `/circles/${circle}/notes`, "achieng", { body: "Agreed to buy from the Kongowea wholesaler.", held_at: yesterday });
  assert.equal(minutes.json.kind, "meeting");
  await call("POST", `/circles/${circle}/notes`, "mumbi", { body: "I can collect the stock on Saturday." });
  const notes = await call("GET", `/circles/${circle}/notes`, "wanjiku");
  assert.deepEqual(notes.json.map((n: any) => n.kind).sort(), ["meeting", "note"]);

  const asked = await call("POST", `/circles/${circle}/decisions`, "mumbi", { question: "Raise the contribution to KSh 3,000?" });
  const vote = (who: Who, choice: string) => call("POST", `/circles/${circle}/decisions/${asked.json.id}/vote`, who, { choice });

  await vote("wanjiku", "yes");
  await vote("mumbi", "no");
  const changed = await vote("mumbi", "yes");
  assert.deepEqual(changed.json.votes, { yes: 2, no: 0, abstain: 0, not_voted: 1 });
  assert.equal(changed.json.my_vote, "yes");

  assert.equal((await call("POST", `/circles/${circle}/decisions/${asked.json.id}/close`, "mumbi")).status, 403);
  const closed = await call("POST", `/circles/${circle}/decisions/${asked.json.id}/close`, "wanjiku");
  assert.equal(closed.json.status, "closed");
  assert.equal((await vote("achieng", "no")).json.error.code, "DECISION_CLOSED");
});

test("a circle sees group funding, and what registering the group would unlock", async () => {
  const groupOf = async () => {
    const res = await call("GET", `/circles/${circle}/funding`, "mumbi");
    return Object.fromEntries(res.json.funders.map((f: any) => [f.name, f]));
  };

  const before = await groupOf();
  assert.equal(before["Chama Starter Grant (demo)"].group, "apply_now");
  assert.equal(before["Vikundi Group Loan (demo)"].group, "apply_after");
  assert.deepEqual(before["Vikundi Group Loan (demo)"].gaps.map((g: any) => g.ref), ["group_registration"]);

  assert.equal((await call("PATCH", `/circles/${circle}`, "mumbi", { registration_status: "registered" })).status, 403);
  await call("PATCH", `/circles/${circle}`, "wanjiku", { registration_status: "registered", registration_number: "SHG/2026/001" });
  assert.equal((await groupOf())["Vikundi Group Loan (demo)"].group, "apply_now");

  // Group funders are not offered to a founder on her own.
  const own = await call("GET", "/funding/matches", "stranger");
  const names = [...own.json.apply_now, ...own.json.apply_after, ...own.json.not_for_you].map((c: any) => c.funder.name);
  assert.ok(!names.includes("Vikundi Group Loan (demo)"));
});

test("the circle has a group chat for exactly its members", async () => {
  const room = (await call("GET", "/conversations", "mumbi")).json.find((c: any) => c.circle_id === circle);
  assert.equal(room.type, "circle");
  assert.equal(room.title, `Mama Mboga Savers ${run}`);

  assert.equal((await call("POST", `/conversations/${room.id}/messages`, "mumbi", { body: "Stock arrives Saturday." })).status, 201);
  assert.equal((await call("GET", `/conversations/${room.id}/messages`, "achieng")).json.messages[0].body, "Stock arrives Saturday.");
  assert.equal((await call("GET", `/conversations/${room.id}/messages`, "stranger")).status, 404);
});

test("members of a circle can open a deal without a separate connection", async () => {
  const refused = await call("POST", "/deals", "stranger", { type: "joint_venture", title: `Shared stall ${run}`, with_user_id: ids.mumbi });
  assert.equal(refused.json.error.code, "NOT_CONNECTED");

  const opened = await call("POST", "/deals", "achieng", { type: "joint_venture", title: `Shared stall ${run}`, with_user_id: ids.mumbi });
  assert.equal(opened.status, 201);
  assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: opened.json.id } })).circle_id, circle);
});

test("a member can leave, the organiser can remove someone, and both lose the chat", async () => {
  assert.equal((await call("DELETE", `/circles/${circle}/members/${ids.wanjiku}`, "wanjiku")).json.error.code, "ORGANISER_CANNOT_LEAVE");
  assert.equal((await call("DELETE", `/circles/${circle}/members/${ids.mumbi}`, "achieng")).status, 403);

  assert.equal((await call("DELETE", `/circles/${circle}/members/${ids.mumbi}`, "wanjiku")).status, 200);
  assert.equal((await call("GET", `/circles/${circle}`, "mumbi")).status, 404);
  assert.ok(!(await call("GET", "/conversations", "mumbi")).json.some((c: any) => c.circle_id === circle));

  assert.equal((await call("DELETE", `/circles/${circle}/members/${ids.achieng}`, "achieng")).status, 200);
  // Her payments stay on the circle's record after she leaves.
  assert.equal((await call("GET", `/circles/${circle}`, "wanjiku")).json.total_contributed_kes, 2500);
});

test("a learning circle can be found, suggested with a reason, and joined without an invite", async () => {
  const made = await call("POST", "/circles", "wanjiku", {
    name: `Coast Retailers Learning Group ${run}`,
    type: "learning",
    sector: "retail",
    county: "Mombasa",
    discoverable: true,
  });
  learning = made.json.id;
  assert.equal(made.json.notice, null);

  const suggested = (await call("GET", "/circles/suggested", "stranger")).json.find((c: any) => c.id === learning);
  assert.deepEqual(suggested.reasons, ["For retail businesses, like yours", "Based in Mombasa, like you"]);

  const joined = await call("POST", `/circles/${learning}/join`, "stranger");
  assert.equal(joined.json.members.length, 2);
  assert.ok(!(await call("GET", "/circles/suggested", "stranger")).json.some((c: any) => c.id === learning));

  // No money in a learning circle.
  const refused = await call("POST", `/circles/${learning}/contributions`, "wanjiku", { member_id: ids.stranger, amount_kes: 100, paid_at: yesterday });
  assert.equal(refused.json.error.code, "NOT_A_MONEY_CIRCLE");

  // Its invite link can be shared with more than one person.
  const link = await invite(learning);
  assert.equal(link.single_use, false);
  await call("POST", "/circles/join", "achieng", { token: link.token });
  assert.equal((await call("POST", "/circles/join", "mumbi", { token: link.token })).status, 200);
});
