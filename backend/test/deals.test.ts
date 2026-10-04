import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { app } from "../src/app.js";
import { prisma } from "../src/shared/db.js";

// Connections and deals, as one story: a founder and an investor
// connect, open an investment deal, agree terms together, bring in a
// lawyer, close it, and the investment appears on the investor's track
// record once everyone allows it.
//
// Runs against DATABASE_URL (with the demo data loaded) and removes
// what it creates.

const run = Date.now();
const password = "correct-horse-battery";
const people = {
  founder: { role: "founder", full_name: "Amina Founder", approved: true },
  investor: { role: "investor", full_name: "Grace Investor", approved: true },
  lawyer: { role: "expert", full_name: "Wanjiru Lawyer", approved: true },
  admin: { role: "admin", full_name: "Deal Admin", approved: true },
  outsider: { role: "founder", full_name: "Otieno Outsider", approved: true },
  newcomer: { role: "founder", full_name: "Not Yet Approved", approved: false },
} as const;
type Who = keyof typeof people;
const email = (who: Who) => `deal-${who}-${run}@example.com`;

let base = "";
let server: ReturnType<typeof app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let dealId = "";

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
  assert.equal(asked.status, 201);
  const answered = await call("PATCH", `/connections/${asked.json.id}`, to, { status: "accepted" });
  assert.equal(answered.json.status, "accepted");
}

const PDF = Buffer.from("%PDF-1.4 a demo document, not a real certificate");

async function share(who: Who, type: string, bytes = PDF, mime = "application/pdf") {
  const form = new FormData();
  form.append("type", type);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), `${type}.pdf`);
  const res = await fetch(`${base}/deals/${dealId}/documents`, {
    method: "POST",
    headers: { authorization: `Bearer ${tokens[who]}` },
    body: form,
  });
  return { status: res.status, json: (await res.json()) as any };
}

const stage = (who: Who, to_stage: string) => call("POST", `/deals/${dealId}/stage`, who, { to_stage });
const confirm = (who: Who) => call("POST", `/deals/${dealId}/stage/confirm`, who);

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  // Vetting has its own tests, so these members start out already decided.
  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const { role, full_name, approved } = people[who];
    const user = await prisma.user.create({
      data: { email: email(who), full_name, role, password_hash, approval_status: approved ? "approved" : "draft" },
    });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email: email(who), password })).json.token;
    // Consent has its own tests, so these members have agreed to be seen.
    await prisma.consent.create({ data: { user_id: user.id, purpose: "profile_visibility", granted: true, granted_at: new Date() } });
  }

  await call("PUT", "/me/profile", "founder", {
    journey_type: "startup",
    business_status: "limited_company",
    business_name: `Afya Booking ${run}`,
    description: "A clinic booking app for county hospitals",
    sector: "health",
    county: "Nairobi",
    funding_amount_kes: 1_000_000,
    stage: "mvp",
  });
});

after(async () => {
  await prisma.deal.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("connections are between approved members, and only the person asked can accept", async () => {
  assert.equal((await call("POST", "/connections", "newcomer", { user_id: ids.investor })).json.error.code, "APPROVAL_REQUIRED");
  assert.equal((await call("POST", "/connections", "founder", { user_id: ids.newcomer })).status, 404);
  assert.equal((await call("POST", "/connections", "founder", { user_id: ids.founder })).status, 400);

  const asked = await call("POST", "/connections", "founder", { user_id: ids.investor, message: "We fit your health mandate." });
  assert.equal(asked.status, 201);
  assert.equal(asked.json.status, "pending");

  // Asking twice, from either side, does not make a second connection.
  assert.equal((await call("POST", "/connections", "investor", { user_id: ids.founder })).status, 409);
  // The person who asked cannot accept for the other.
  assert.equal((await call("PATCH", `/connections/${asked.json.id}`, "founder", { status: "accepted" })).status, 404);

  const profile = await call("GET", `/profiles/${ids.founder}`, "investor");
  assert.equal(profile.json.connection.status, "pending");

  await call("PATCH", `/connections/${asked.json.id}`, "investor", { status: "accepted" });
  const mine = await call("GET", "/connections", "investor");
  assert.deepEqual(mine.json.map((c: any) => [c.with.full_name, c.direction, c.status]), [["Amina Founder", "received", "accepted"]]);
});

test("a deal needs an accepted connection, and is invisible to everyone else", async () => {
  const deal = { type: "investment", title: `Seed round ${run}`, with_user_id: ids.investor };

  const stranger = await call("POST", "/deals", "outsider", deal);
  assert.equal(stranger.json.error.code, "NOT_CONNECTED");

  const noSuchFunder = await call("POST", "/deals", "founder", { ...deal, source_funder_id: "01999999-9999-7999-8999-999999999999" });
  assert.equal(noSuchFunder.json.error.code, "UNKNOWN_FUNDER");

  const opened = await call("POST", "/deals", "founder", deal);
  assert.equal(opened.status, 201);
  dealId = opened.json.id;
  assert.equal(opened.json.stage, "exploring");
  assert.equal(opened.json.next_stage, "due_diligence");
  assert.deepEqual(opened.json.parties.map((p: any) => [p.full_name, p.role]), [
    ["Amina Founder", "founder"],
    ["Grace Investor", "investor"],
  ]);
  assert.match(opened.json.notice, /through their bank, never through FounderLink/);

  assert.equal((await call("GET", `/deals/${dealId}`, "outsider")).status, 404);
  assert.deepEqual((await call("GET", "/deals", "outsider")).json, []);
  assert.equal((await call("GET", "/deals", "investor")).json.length, 1);
});

test("stages go one step at a time, and an ordinary step needs only one party", async () => {
  assert.equal((await stage("founder", "terms_agreed")).json.error.code, "WRONG_STAGE");

  const moved = await stage("investor", "due_diligence");
  assert.equal(moved.json.stage, "due_diligence");
  assert.equal(moved.json.pending, null);
});

test("documents are shared only by the parties, and only once the deal reaches due diligence", async () => {
  const early = await call("POST", "/deals", "outsider", { type: "investment", title: `Too early ${run}`, with_user_id: ids.investor });
  assert.equal(early.json.error.code, "NOT_CONNECTED");

  assert.equal((await share("outsider", "business_registration")).status, 404);
  assert.equal((await share("founder", "passport")).status, 400);
  assert.equal((await share("founder", "business_registration", Buffer.from("MZ not a pdf"))).json.error.code, "UNSUPPORTED_FILE");
  assert.equal((await call("GET", `/deals/${dealId}/due-diligence`, "outsider")).status, 404);

  const before = await call("GET", `/deals/${dealId}/due-diligence`, "founder");
  assert.equal(before.json.deal_ready, false);
  assert.deepEqual(
    before.json.parties.map((p: any) => [p.role, p.ready, p.missing]),
    [
      ["founder", false, ["Business registration certificate", "KRA PIN certificate"]],
      ["investor", false, ["Organisation or fund documents"]],
    ],
  );
  assert.match(before.json.summary, /3 documents are still missing/);
});

test("terms cannot be agreed until every party has shared her documents", async () => {
  const blocked = await stage("founder", "terms_agreed");
  assert.equal(blocked.status, 409);
  assert.equal(blocked.json.error.code, "NOT_DEAL_READY");
  assert.match(blocked.json.error.message, /KRA PIN certificate \(Amina Founder\)/);

  const registration = await share("founder", "business_registration");
  assert.equal(registration.status, 201);
  // The AI service is off in these tests, so nothing claims a pre-check.
  assert.equal(registration.json.precheck, null);
  assert.equal(registration.json.check, "uploaded");
  const pin = await share("founder", "kra_pin_certificate");
  await share("investor", "organisation_proof");

  // Each party can open the other's documents. Nobody else can.
  const file = await fetch(`${base}/deals/${dealId}/documents/${pin.json.id}/file`, { headers: { authorization: `Bearer ${tokens.investor}` } });
  assert.equal(file.status, 200);
  assert.equal(Buffer.from(await file.arrayBuffer()).toString(), PDF.toString());
  const stranger = await fetch(`${base}/deals/${dealId}/documents/${pin.json.id}/file`, { headers: { authorization: `Bearer ${tokens.outsider}` } });
  assert.equal(stranger.status, 404);

  // An admin rejects one, with a reason: the deal is held back again.
  assert.equal((await call("GET", "/admin/deal-documents", "founder")).status, 403);
  const queue = await call("GET", "/admin/deal-documents", "admin");
  assert.ok(queue.json.some((d: any) => d.id === pin.json.id && d.uploaded_by.full_name === "Amina Founder"));
  assert.equal((await call("PATCH", `/admin/deal-documents/${pin.json.id}`, "admin", { status: "rejected" })).status, 400);
  await call("PATCH", `/admin/deal-documents/${pin.json.id}`, "admin", { status: "rejected", reason: "The page is cut off" });
  assert.equal((await stage("founder", "terms_agreed")).json.error.code, "NOT_DEAL_READY");
  assert.equal((await call("DELETE", `/deals/${dealId}/documents/${pin.json.id}`, "founder")).json.error.code, "ALREADY_REVIEWED");
  const told = await call("GET", "/notifications", "founder");
  assert.ok(JSON.stringify(told.json).includes("The page is cut off"));

  // She shares another, and the admin confirms the registration.
  await share("founder", "kra_pin_certificate");
  const confirmed = await call("PATCH", `/admin/deal-documents/${registration.json.id}`, "admin", { status: "verified" });
  assert.equal(confirmed.json.check_label, "Confirmed by FounderLink");

  const pack = await call("GET", `/deals/${dealId}/due-diligence`, "investor");
  assert.equal(pack.json.deal_ready, true);
  // Compiled by the backend's rules here, and it says so.
  assert.equal(pack.json.engine, "stand_in");
  const [founder, investor] = pack.json.parties;
  assert.ok(founder.verified.includes("Business registration certificate: confirmed by FounderLink"));
  assert.ok(founder.self_reported.includes("KRA PIN certificate: uploaded, not yet confirmed"));
  assert.deepEqual(founder.missing, []);
  assert.deepEqual(investor.missing, []);
  assert.equal((await call("GET", `/admin/deals/${dealId}/due-diligence`, "admin")).json.deal_ready, true);
});

test("terms are agreed only when every party has confirmed the same terms", async () => {
  await call("PATCH", `/deals/${dealId}/terms`, "founder", { amount_kes: 1_000_000, instrument: "equity", equity_percent: 10 });
  assert.equal((await call("PATCH", `/deals/${dealId}/terms`, "founder", { valuation: "huge" })).status, 400);

  const proposed = await stage("founder", "terms_agreed");
  assert.equal(proposed.json.stage, "due_diligence");
  assert.deepEqual(proposed.json.pending.waiting_for.map((p: any) => p.full_name), ["Grace Investor"]);

  // One person cannot push it through by confirming again.
  assert.equal((await confirm("founder")).json.stage, "due_diligence");
  assert.equal((await stage("founder", "terms_agreed")).json.error.code, "ALREADY_PROPOSED");

  // The investor changes the terms, so the founder's yes no longer stands.
  const changed = await call("PATCH", `/deals/${dealId}/terms`, "investor", { equity_percent: 12 });
  assert.equal(changed.json.pending, null);
  assert.deepEqual(changed.json.terms, { amount_kes: 1_000_000, instrument: "equity", equity_percent: 12 });
  assert.equal((await confirm("investor")).json.error.code, "NOTHING_TO_CONFIRM");

  await stage("investor", "terms_agreed");
  const agreed = await confirm("founder");
  assert.equal(agreed.json.stage, "terms_agreed");
  assert.equal(agreed.json.pending, null);

  assert.equal((await call("PATCH", `/deals/${dealId}/terms`, "founder", { equity_percent: 5 })).json.error.code, "TERMS_AGREED");
});

test("a party can bring in an adviser she is connected with", async () => {
  assert.equal((await call("POST", `/deals/${dealId}/parties`, "founder", { user_id: ids.lawyer })).json.error.code, "NOT_CONNECTED");

  await connect("founder", "lawyer");
  const joined = await call("POST", `/deals/${dealId}/parties`, "founder", { user_id: ids.lawyer });
  assert.deepEqual(joined.json.parties.map((p: any) => p.role), ["founder", "investor", "expert"]);
  assert.equal((await call("GET", `/deals/${dealId}`, "lawyer")).status, 200);
});

test("the deal has its own checklist, and updates go on the timeline", async () => {
  await stage("founder", "documents_compliance");

  const list = await call("GET", `/deals/${dealId}/compliance`, "lawyer");
  assert.equal(list.json.progress.text, "0 of 6 done");
  assert.ok(list.json.items.some((i: any) => i.id === "deal_investment_term_sheet"));

  const signed = await call("PATCH", `/deals/${dealId}/compliance/deal_investment_term_sheet`, "lawyer", {
    status: "complete",
    note: "Signed 3 Oct",
  });
  assert.equal(signed.json.status, "complete");
  assert.equal((await call("GET", `/deals/${dealId}/compliance`, "founder")).json.progress.done, 1);

  // An item from another deal type, or from the business checklist, is not on this deal.
  assert.equal((await call("PATCH", `/deals/${dealId}/compliance/deal_cofounder_agreement`, "lawyer", { status: "complete" })).status, 404);
  assert.equal((await call("PATCH", `/deals/${dealId}/compliance/kra_pin`, "lawyer", { status: "complete" })).status, 404);
  assert.equal((await call("GET", `/deals/${dealId}/compliance`, "outsider")).status, 404);
});

test("closing needs every party, and sets up the check-ins", async () => {
  await stage("investor", "closed");
  assert.equal((await confirm("founder")).json.stage, "documents_compliance");

  const closed = await confirm("lawyer");
  assert.equal(closed.json.stage, "closed");
  assert.ok(closed.json.closed_at);
  assert.deepEqual(closed.json.milestones.map((m: any) => m.title), ["30-day check-in", "90-day check-in", "180-day check-in"]);

  // The shared files are kept 30 more days, then deleted.
  const kept = await prisma.dealDocument.findMany({ where: { deal_id: dealId } });
  assert.ok(kept.length >= 3 && kept.every((d) => d.delete_after && d.delete_after > new Date()));

  const active = await stage("founder", "active");
  assert.equal(active.json.stage, "active");
  assert.equal(active.json.next_stage, null);
});

test("a closed investment shows on the investor's track record only when every party allows it", async () => {
  const record = async () => (await call("GET", `/profiles/${ids.investor}`, "outsider")).json.track_record;
  assert.deepEqual(await record(), []);

  await call("PATCH", `/deals/${dealId}/sharing`, "investor", { share: true });
  const partly = await call("PATCH", `/deals/${dealId}/sharing`, "founder", { share: true });
  assert.equal(partly.json.shown_on_track_records, false);
  assert.deepEqual(await record(), []);

  const all = await call("PATCH", `/deals/${dealId}/sharing`, "lawyer", { share: true });
  assert.equal(all.json.shown_on_track_records, true);
  assert.deepEqual(
    (await record()).map((e: any) => [e.company_name, e.sector, e.instrument, e.source_label]),
    [[`Afya Booking ${run}`, "health", "equity", "Verified on FounderLink"]],
  );

  // A verified entry cannot be edited by hand, and a party can withdraw.
  const entry = await prisma.portfolioEntry.findFirstOrThrow({ where: { deal_id: dealId } });
  const edit = await call("PATCH", `/me/portfolio/${entry.id}`, "investor", { company_name: "Something Bigger" });
  assert.equal(edit.json.error.code, "VERIFIED_ENTRY");

  await call("PATCH", `/deals/${dealId}/sharing`, "founder", { share: false });
  assert.deepEqual(await record(), []);
});

test("the timeline tells the story in order, to every party", async () => {
  const timeline = await call("GET", `/deals/${dealId}/timeline`, "lawyer");
  const texts = timeline.json.map((e: any) => e.text);

  assert.equal(texts[0], "Amina Founder opened the deal");
  assert.ok(texts.includes("Grace Investor moved the deal to Due diligence"));
  assert.ok(texts.includes("Amina Founder proposed moving the deal to Terms agreed"));
  assert.ok(texts.includes("Wanjiru Lawyer updated the checklist: Term sheet is complete"));
  assert.ok(texts.includes("Wanjiru Lawyer moved the deal to Closed"));
  assert.ok(timeline.json.some((e: any) => e.note === "Confirmations were reset because the terms changed"));

  assert.equal((await call("GET", `/deals/${dealId}/timeline`, "outsider")).status, 404);
});

test("milestones can be added and ticked off", async () => {
  const added = await call("POST", `/deals/${dealId}/milestones`, "investor", { title: "First board meeting", due_date: "2026-12-01" });
  assert.equal(added.status, 201);

  const done = await call("PATCH", `/deals/${dealId}/milestones/${added.json.id}`, "founder", { status: "done" });
  assert.equal(done.json.status, "done");
  assert.equal(done.json.title, "First board meeting");
});

test("any party can pause or decline with a reason, and declined is final", async () => {
  await connect("outsider", "investor");
  const other = await call("POST", "/deals", "outsider", { type: "investment", title: `Other round ${run}`, with_user_id: ids.investor });
  const otherId = other.json.id;
  const status = (who: Who, body: object) => call("POST", `/deals/${otherId}/status`, who, body);

  assert.equal((await status("investor", { status: "paused" })).status, 400);

  const paused = await status("investor", { status: "paused", reason: "Waiting for audited accounts." });
  assert.equal(paused.json.status, "paused");
  assert.equal(paused.json.next_stage, null);
  assert.equal((await call("POST", `/deals/${otherId}/stage`, "outsider", { to_stage: "due_diligence" })).json.error.code, "DEAL_NOT_OPEN");

  assert.equal((await status("outsider", { status: "open", reason: "Accounts are ready." })).json.status, "open");
  assert.equal((await status("investor", { status: "declined", reason: "Outside our mandate after all." })).json.status, "declined");
  assert.equal((await status("outsider", { status: "open", reason: "Please reconsider." })).json.error.code, "DEAL_DECLINED");
});
