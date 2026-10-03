import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { checkMessage } from "../src/ai/standin.js";
import { app } from "../src/app.js";
import { notify } from "../src/modules/notifications/notifications.service.js";
import { attachRealtime } from "../src/realtime.js";
import { prisma } from "../src/shared/db.js";

// Messaging: direct chats, deal rooms, live delivery, the scam warning,
// reports and blocks. Runs against DATABASE_URL and removes what it creates.

test("the scam check flags requests for money, not ordinary talk about payments", () => {
  assert.deepEqual(checkMessage("Happy to meet on Tuesday to walk through the deck.").flagged, false);
  assert.deepEqual(checkMessage("Our app lets clinics accept M-Pesa payments.").flagged, false);

  assert.deepEqual(checkMessage("Pay the processing fee first, then we release the funds.").reasons, ["Mentions a fee to be paid"]);
  assert.deepEqual(checkMessage("Tuma pesa kwa 0712345678 leo").reasons, ["Asks for money to be sent"]);
  assert.deepEqual(checkMessage("Use M-Pesa paybill 522533 to secure your slot").reasons, ["Gives payment details to pay into"]);
});

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  founder: { role: "founder", full_name: "Amina Founder" },
  investor: { role: "investor", full_name: "Grace Investor" },
  lawyer: { role: "expert", full_name: "Wanjiru Lawyer" },
  outsider: { role: "founder", full_name: "Otieno Outsider" },
} as const;
type Who = keyof typeof people;

let base = "";
let wsBase = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let direct = "";

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

async function connect(from: Who, to: Who) {
  const asked = await call("POST", "/connections", from, { user_id: ids[to] });
  await call("PATCH", `/connections/${asked.json.id}`, to, { status: "accepted" });
}

const say = (who: Who, conversation: string, body: string) =>
  call("POST", `/conversations/${conversation}/messages`, who, { body });

// Opens a socket, authenticates, and collects what is pushed to it.
async function listen(token: string) {
  const socket = new WebSocket(`${wsBase}/ws`);
  const events: any[] = [];
  let closeCode: number | null = null;
  socket.addEventListener("message", (e) => events.push(JSON.parse(String(e.data))));
  socket.addEventListener("close", (e) => (closeCode = e.code));
  await new Promise((resolve) => socket.addEventListener("open", resolve));
  socket.send(JSON.stringify({ type: "auth", token }));

  const until = async (done: () => boolean) => {
    for (let i = 0; i < 100 && !done(); i++) await new Promise((r) => setTimeout(r, 20));
    assert.ok(done(), "timed out waiting on the socket");
  };
  return { socket, events, until, closed: () => closeCode };
}

before(async () => {
  server = app.listen(0);
  attachRealtime(server);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://localhost:${port}`;
  wsBase = `ws://localhost:${port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `msg-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, ...people[who], password_hash, approval_status: "approved" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }
});

after(async () => {
  await prisma.conversation.deleteMany({ where: { members: { some: { user_id: { in: Object.values(ids) } } } } });
  await prisma.deal.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.closeAllConnections();
  server.close();
});

test("a direct chat needs an accepted connection, and two people only ever have one", async () => {
  const refused = await call("POST", "/conversations", "founder", { user_id: ids.investor });
  assert.equal(refused.json.error.code, "NOT_CONNECTED");

  await connect("founder", "investor");
  const opened = await call("POST", "/conversations", "founder", { user_id: ids.investor });
  assert.equal(opened.status, 201);
  direct = opened.json.id;

  const again = await call("POST", "/conversations", "investor", { user_id: ids.founder });
  assert.equal(again.status, 200);
  assert.equal(again.json.id, direct);
});

test("messages are stored, counted as unread for the other person, and cleared when read", async () => {
  const sent = await say("founder", direct, "Hello Grace, thank you for connecting.");
  assert.equal(sent.status, 201);
  assert.equal(sent.json.sender.full_name, "Amina Founder");
  await say("founder", direct, "Could we talk this week?");

  const mine = (await call("GET", "/conversations", "founder")).json[0];
  assert.equal(mine.unread_count, 0);

  const theirs = (await call("GET", "/conversations", "investor")).json[0];
  assert.equal(theirs.title, "Amina Founder");
  assert.equal(theirs.unread_count, 2);
  assert.equal(theirs.last_message.body, "Could we talk this week?");

  assert.equal((await call("POST", `/conversations/${direct}/read`, "investor")).json.unread_count, 0);
  assert.equal((await call("GET", "/conversations", "investor")).json[0].unread_count, 0);
});

test("only members can read or write a conversation", async () => {
  assert.equal((await call("GET", `/conversations/${direct}/messages`, "outsider")).status, 404);
  assert.equal((await say("outsider", direct, "Let me in")).status, 404);
  assert.equal((await call("POST", `/conversations/${direct}/read`, "outsider")).status, 404);
  assert.deepEqual((await call("GET", "/conversations", "outsider")).json, []);
  assert.equal((await say("founder", direct, "   ")).status, 400);
});

test("history comes newest first, a page at a time", async () => {
  await say("investor", direct, "Yes, Thursday works.");

  const first = await call("GET", `/conversations/${direct}/messages?limit=2`, "founder");
  assert.deepEqual(first.json.messages.map((m: any) => m.body), ["Yes, Thursday works.", "Could we talk this week?"]);

  const older = await call("GET", `/conversations/${direct}/messages?limit=2&before=${first.json.next_before}`, "founder");
  assert.deepEqual(older.json.messages.map((m: any) => m.body), ["Hello Grace, thank you for connecting."]);
  assert.equal(older.json.next_before, null);
});

test("a message asking for money carries a warning for the person receiving it", async () => {
  const sent = await say("investor", direct, "Send the processing fee by M-Pesa to 0712345678 and we release the funds.");
  // The sender is not shown a warning about her own message.
  assert.equal(sent.json.warning, null);

  const received = (await call("GET", `/conversations/${direct}/messages?limit=1`, "founder")).json.messages[0];
  assert.match(received.warning.text, /Never pay anyone to receive funding/);
  assert.deepEqual(received.warning.reasons, ["Mentions a fee to be paid", "Gives payment details to pay into"]);
  // Flagged, not blocked: the message is still delivered.
  assert.match(received.body, /processing fee/);
});

test("the socket needs a valid token and then pushes new messages live", async () => {
  const bad = await listen("not-a-token");
  await bad.until(() => bad.closed() !== null);
  assert.equal(bad.closed(), 4401);

  const live = await listen(tokens.investor!);
  await live.until(() => live.events.some((e) => e.type === "ready"));

  await say("founder", direct, "Are you there?");
  await live.until(() => live.events.some((e) => e.type === "message"));
  const pushed = live.events.find((e) => e.type === "message");
  assert.equal(pushed.message.body, "Are you there?");
  assert.equal(pushed.message.conversation_id, direct);

  live.socket.close();
});

test("a deal has its own room, where every party sees the deal's progress", async () => {
  const deal = await call("POST", "/deals", "founder", { type: "investment", title: `Seed round ${run}`, with_user_id: ids.investor });
  const room = (await call("GET", "/conversations", "investor")).json.find((c: any) => c.deal_id === deal.json.id);
  assert.equal(room.type, "deal");
  assert.equal(room.title, `Seed round ${run}`);

  await call("POST", `/deals/${deal.json.id}/stage`, "investor", { to_stage: "due_diligence" });
  await say("founder", room.id, "Sharing our accounts tomorrow.");

  const history = await call("GET", `/conversations/${room.id}/messages`, "investor");
  assert.deepEqual(
    history.json.messages.map((m: any) => [m.kind, m.body]).reverse(),
    [
      ["system", "Amina Founder opened the deal"],
      ["system", "Grace Investor moved the deal to Due diligence"],
      ["user", "Sharing our accounts tomorrow."],
    ],
  );

  // Someone added to the deal joins its room. Until then she cannot see it.
  assert.equal((await call("GET", `/conversations/${room.id}/messages`, "lawyer")).status, 404);
  await connect("founder", "lawyer");
  await call("POST", `/deals/${deal.json.id}/parties`, "founder", { user_id: ids.lawyer });
  assert.equal((await call("GET", `/conversations/${room.id}/messages`, "lawyer")).status, 200);
});

test("blocking stops direct messages both ways without saying who blocked whom", async () => {
  await call("PUT", `/users/${ids.investor}/block`, "founder");

  const fromBlocked = await say("investor", direct, "Hello?");
  const fromBlocker = await say("founder", direct, "Hello?");
  assert.equal(fromBlocked.status, 403);
  assert.deepEqual(fromBlocked.json, fromBlocker.json);

  await call("DELETE", `/users/${ids.investor}/block`, "founder");
  assert.equal((await say("investor", direct, "Hello again")).status, 201);
});

test("reports go to admins, and reports from three different members suspend the sender", async () => {
  const room = (await call("GET", "/conversations", "lawyer")).json.find((c: any) => c.type === "deal");
  const scam = (await say("investor", room.id, "Send money now to keep your place.")).json;

  assert.equal((await call("POST", `/messages/${scam.id}/report`, "outsider", { reason: "Not my conversation" })).status, 404);
  assert.equal((await call("POST", `/messages/${scam.id}/report`, "investor", { reason: "My own message" })).status, 400);

  const first = await call("POST", `/messages/${scam.id}/report`, "founder", { reason: "Asks for money up front." });
  assert.equal(first.status, 201);
  assert.equal(first.json.sender_suspended, false);
  assert.equal((await call("POST", `/messages/${scam.id}/report`, "founder", { reason: "Asks for money again." })).status, 409);

  const second = await call("POST", `/messages/${scam.id}/report`, "lawyer", { reason: "Looks like a scam request." });
  assert.equal(second.json.sender_suspended, false);

  // A third member sees another of her messages, in a direct chat.
  await connect("outsider", "investor");
  const chat = await call("POST", "/conversations", "outsider", { user_id: ids.investor });
  const other = (await say("investor", chat.json.id, "Pay the registration fee to start.")).json;
  const third = await call("POST", `/messages/${other.id}/report`, "outsider", { reason: "Demanding a fee." });
  assert.equal(third.json.sender_suspended, true);

  // Suspended means locked out at once.
  assert.equal((await say("investor", room.id, "Still here?")).json.error.code, "APPROVAL_REQUIRED");
});

test("a suspended member gets no live chat, but still gets her notifications", async () => {
  // Grace was suspended in the test above. She can still connect.
  const live = await listen(tokens.investor!);
  await live.until(() => live.events.some((e) => e.type === "ready"));

  const room = (await call("GET", "/conversations", "founder")).json.find((c: any) => c.type === "deal");
  await say("founder", room.id, "Is anyone still here?");
  await notify(ids.investor!, { type: "test", title: "Your account was suspended", body: "An admin will review it." });

  await live.until(() => live.events.some((e) => e.type === "notification"));
  assert.equal(live.events.some((e) => e.type === "message"), false);
  live.socket.close();
});
