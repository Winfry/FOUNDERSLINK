import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";
import { ASKS_PER_HOUR, plainText } from "../src/modules/copilot/copilot.service.js";
import { TOOLS } from "../src/modules/copilot/tools.js";
import { detectLanguage } from "../src/modules/copilot/planner.js";

// The Founder Copilot (phase 1). Runs without a language model (setup.ts),
// so the Copilot plans with its rules from the founder's own data. Runs
// against DATABASE_URL and removes what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  amina: { role: "founder", full_name: "Amina Wanjiru", approved: false },
  achieng: { role: "founder", full_name: "Achieng Otieno", approved: true },
  grace: { role: "investor", full_name: "Grace Investor", approved: true },
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

const profile = {
  journey_type: "startup",
  business_status: "limited_company",
  business_name: `ClinicBook ${run}`,
  description: "Patients book visits at small clinics and get reminders by SMS.",
  sector: "health",
  county: "Nairobi",
  funding_amount_kes: 1_000_000,
  stage: "mvp",
};

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const { role, full_name, approved } = people[who];
    const email = `cop-${who}-${run}@example.com`;
    const user = await prisma.user.create({ data: { email, role, full_name, password_hash, approval_status: approved ? "approved" : "draft" } });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }
  assert.equal((await call("PUT", "/me/profile", "amina", profile)).status, 200, "Amina's profile saves");
});

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  server.close();
});

test("only founders have a Copilot", async () => {
  assert.equal((await call("POST", "/copilot/ask", "grace", { message: "What should I focus on?" })).status, 403, "an investor is refused");
  assert.equal((await call("GET", "/copilot/tasks", "grace")).status, 403, "an investor cannot list tasks");
  assert.equal((await call("POST", "/copilot/ask", undefined, { message: "Hello there" })).status, 401, "signed out is refused");
});

test("a plan is made from her own data, and its tasks wait for her approval", async () => {
  const res = await call("POST", "/copilot/ask", "amina", { message: "What should I focus on this week?" });
  assert.equal(res.status, 200, "the Copilot answers");
  assert.equal(res.json.engine, "rules", "no model in tests: planned with rules");
  assert.match(res.json.reply, /Amina/, "it greets her by name");
  assert.match(res.json.reply, /verif/i, "an unverified founder is told to get verified first");
  assert.ok(res.json.proposals.length > 0 && res.json.proposals.length <= 5, "it suggests a few tasks");
  assert.ok(res.json.proposals.every((t: any) => t.status === "proposed"), "every suggestion waits for approval");

  // Nothing is on her list until she approves it.
  const listed = (await call("GET", "/copilot/tasks", "amina")).json;
  assert.ok(listed.every((t: any) => t.status === "proposed"), "no open task before approval");

  const first = res.json.proposals[0];
  const approved = await call("POST", `/copilot/tasks/${first.id}/approve`, "amina");
  assert.equal(approved.json.status, "open", "approving makes it a real task");
  assert.equal((await call("POST", `/copilot/tasks/${first.id}/approve`, "amina")).status, 409, "it cannot be approved twice");
  assert.equal((await call("POST", `/copilot/tasks/${first.id}/done`, "amina")).json.status, "done", "she can finish it");

  const second = res.json.proposals[1];
  if (second) assert.equal((await call("POST", `/copilot/tasks/${second.id}/dismiss`, "amina")).json.status, "dismissed", "she can say no");
});

test("asking again does not suggest the same open task twice", async () => {
  const before = await prisma.founderTask.count({ where: { user_id: ids.amina!, status: { in: ["proposed", "open"] } } });
  await call("POST", "/copilot/ask", "amina", { message: "And now?" });
  const titles = (await prisma.founderTask.findMany({ where: { user_id: ids.amina!, status: { in: ["proposed", "open"] } } })).map((t) => t.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length, "no duplicate open or suggested titles");
  assert.ok(titles.length >= before, "suggestions are kept");
});

test("nobody can act on another founder's tasks", async () => {
  const task = await prisma.founderTask.findFirstOrThrow({ where: { user_id: ids.amina!, status: "proposed" } });
  assert.equal((await call("POST", `/copilot/tasks/${task.id}/approve`, "achieng")).status, 404, "another founder cannot approve it");
  assert.equal((await call("GET", "/copilot/tasks", "achieng")).json.length, 0, "and does not see it");
  assert.equal((await prisma.founderTask.findUniqueOrThrow({ where: { id: task.id } })).status, "proposed", "it is unchanged");
});

test("a founder with no business profile is pointed to set one up", async () => {
  const res = await call("POST", "/copilot/ask", "achieng", { message: "Help me get ready for investors" });
  assert.equal(res.status, 200, "the Copilot answers");
  assert.match(res.json.reply, /business profile/i, "she is told to start with her profile");
  assert.equal(res.json.proposals[0]?.link, "/founder/onboarding", "the task leads to the profile");

  const again = await call("POST", "/copilot/ask", "achieng", { message: "What next?" });
  assert.equal(again.json.proposals.length, 0, "the same task is not suggested again");
  assert.doesNotMatch(again.json.reply, /I have suggested/, "so it does not claim a new suggestion");
  assert.match(again.json.reply, /already on your task list/, "it says the task is already there");
});

test("the planner answers in the language she asked in", async () => {
  assert.equal(detectLanguage("Nifanye nini kwanza ili nipate mwekezaji?"), "sw");
  assert.equal(detectLanguage("Habari, nisaidie na biashara yangu"), "sw");
  assert.equal(detectLanguage("Nifanye nini this week?"), "sw", "mixed, with as much Kiswahili, is Kiswahili");
  assert.equal(detectLanguage("What should I focus on this week?"), "en");
  assert.equal(detectLanguage("Help me get ready for investors"), "en");
  assert.equal(detectLanguage("BRS?"), "en", "nothing to go on: English");

  const res = await call("POST", "/copilot/ask", "amina", { message: "Nifanye nini wiki hii ili nipate mwekezaji?" });
  assert.equal(res.status, 200);
  assert.equal(res.json.engine, "rules");
  assert.match(res.json.reply, /^Habari Amina\./, "she is greeted in Kiswahili");
  assert.match(res.json.reply, /Thibitishwa kwanza/, "the steps are in Kiswahili");
  assert.doesNotMatch(res.json.reply, /Here is what|Get verified|I have suggested|already on your/, "with no English sentences");
});

test("Markdown from the model is turned into plain text for the app", () => {
  assert.equal(plainText("1. **Register** your *business* now"), "1. Register your business now");
  assert.equal(plainText("## Your plan\n* First step\n* Second"), "Your plan\n- First step\n- Second");
  assert.equal(plainText("Revenue grew 2*3 times; keep KES 5,000"), "Revenue grew 2*3 times; keep KES 5,000", "a lone asterisk is kept");
});

test("everything the Copilot did is in her activity, in plain words", async () => {
  const items = (await call("GET", "/copilot/activity", "amina")).json as any[];
  const texts = items.map((i) => i.text).join("\n");
  assert.match(texts, /You asked/, "her question is logged");
  assert.match(texts, /Read your business profile/, "each tool it used is logged");
  assert.match(texts, /Suggested/, "its suggestions are logged");
  assert.match(texts, /You approved/, "her approval is logged");
});

test("she can add her own task, which needs no approval", async () => {
  const res = await call("POST", "/copilot/tasks", "amina", { title: "Call the KRA helpdesk", due_date: "2026-12-01" });
  assert.equal(res.status, 201, "added");
  assert.equal(res.json.status, "open", "her own task is open at once");
  assert.equal(res.json.source, "founder", "and marked as hers");
});

test("the Copilot's tools cannot move money, message anyone or touch chamas", () => {
  const names = TOOLS.map((t) => t.name);
  assert.deepEqual(
    names.sort(),
    ["find_investor_matches", "find_relevant_experts", "get_business_profile", "get_readiness_status", "list_my_tasks", "propose_task"].sort(),
    "exactly these tools, five that read and one that suggests",
  );
  for (const t of TOOLS) {
    assert.ok(!("user_id" in ((t.parameters as any).properties ?? {})), `${t.name} takes no user id: it always acts as the signed-in founder`);
  }
});

test("asking is limited per hour", async () => {
  await prisma.copilotEvent.createMany({
    data: Array.from({ length: ASKS_PER_HOUR }, () => ({ user_id: ids.achieng!, kind: "asked", detail: { message: "x" } })),
  });
  assert.equal((await call("POST", "/copilot/ask", "achieng", { message: "One more?" })).status, 429, "too many in an hour is refused");
});
