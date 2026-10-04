import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

// Runs the AI client against a fake AI service, to pin down the contract
// in docs/FUNDING_FLOW.md section 4 without needing the real service.

let reply: (path: string, body: any) => { status?: number; json: unknown };
let seen: { path: string; body: any; key: string | undefined };

const server = createServer((req: IncomingMessage, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = JSON.parse(raw);
    seen = { path: req.url!, body, key: req.headers["x-internal-api-key"] as string | undefined };
    const { status = 200, json } = reply(req.url!, body);
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(json));
  });
});

let client: typeof import("../src/ai/client.js");

before(async () => {
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  // Set before the client loads, because the environment is read once at import.
  process.env.AI_SERVICE_URL = `http://localhost:${(server.address() as AddressInfo).port}`;
  process.env.AI_SERVICE_API_KEY = "test-key";
  client = await import("../src/ai/client.js");
  console.warn = () => {};
});

after(() => server.close());

const profile = {
  journey_type: "sme",
  business_status: "informal",
  description: "Salon in Mombasa, call me on 0712345678",
  sector: "retail",
  county: "Mombasa",
  funding_amount_kes: 150_000,
  use_of_funds: null,
  stage: null,
  instruments: [],
  months_trading: 18,
  monthly_revenue_band: "50k_to_200k",
  has_employees: false,
  handles_personal_data: null,
};

const funders = ["a", "b"].map((id) => ({
  id,
  kind: "bank",
  mandate_text: "Loans for small businesses",
  journey_types: ["sme"],
  sectors: [],
  stages: [],
  counties: [],
  instruments: ["loan"],
  ticket_min_kes: 1_000,
  ticket_max_kes: 900_000,
}));

const verdict = (candidate_id: string) => ({
  candidate_id,
  score: 0.8,
  band: "good",
  signals: [{ signal: "mandate", fits: true, text: "Their mandate covers small retail businesses" }],
  explanation: "From the AI service",
});

test("recommend: sends the key, the profile and every candidate, without contact details", async () => {
  reply = (_path, body) => ({ json: body.candidates.map((c: any) => verdict(c.id)) });
  const out = await client.matchFunders(profile, funders);

  assert.equal(seen.path, "/recommend");
  assert.equal(seen.key, "test-key");
  assert.equal(seen.body.candidates.length, 2);
  assert.equal(seen.body.profile.description, "Salon in Mombasa, call me on [phone removed]");
  assert.deepEqual(Object.keys(seen.body.profile).filter((k) => k.endsWith("_owned")), []);

  assert.equal(out.engine, "ai_service");
  assert.equal(out.results[0]!.funder_id, "a");
  assert.equal(out.results[0]!.band, "good");
  assert.equal(out.results[0]!.explanation, "From the AI service");
});

test("recommend: falls back when a candidate is missing, the answer is invalid, or the service errors", async () => {
  reply = () => ({ json: [verdict("a")] });
  assert.equal((await client.matchFunders(profile, funders)).engine, "stand_in");

  reply = () => ({ json: [{ ...verdict("a"), band: "87%" }, verdict("b")] });
  assert.equal((await client.matchFunders(profile, funders)).engine, "stand_in");

  reply = () => ({ status: 500, json: {} });
  const out = await client.matchFunders(profile, funders);
  assert.equal(out.engine, "stand_in");
  assert.equal(out.results.length, 2);
});

test("extract-profile: sends free_text and reports missing core fields as unsure", async () => {
  reply = () => ({ json: { sector: "retail", county: "Mombasa" } });
  const out = await client.extractProfile("Nina salon Mombasa, mail amina@example.com", "sw");

  assert.equal(seen.path, "/extract-profile");
  assert.deepEqual(seen.body, { free_text: "Nina salon Mombasa, mail [email removed]", language: "sw" });
  assert.equal(out.engine, "ai_service");
  assert.deepEqual(out.fields, { sector: "retail", county: "Mombasa" });
  assert.deepEqual(out.unsure, ["journey_type", "business_status", "funding_amount_kes"]);
});

test("explain-fit: sends the profile, the candidate and a track record without company names", async () => {
  reply = () => ({
    json: { band: "strong", components: [], reasons: ["Their mandate covers you"], track_record_highlights: ["Backed two salons"] },
  });
  const track = [{ sector: "retail", stage: null, source: "public" }];
  const out = await client.explainFit(profile, funders[0]!, track, "sw");

  assert.equal(seen.path, "/explain-fit");
  assert.deepEqual(Object.keys(seen.body).sort(), ["candidate", "language", "profile", "track_record"]);
  assert.deepEqual(seen.body.track_record, track);
  assert.equal(out.engine, "ai_service");
  assert.deepEqual(out.track_record_highlights, ["Backed two salons"]);

  reply = () => ({ status: 500, json: {} });
  assert.equal((await client.explainFit(profile, funders[0]!, track)).engine, "stand_in");
});

test("vetting risk signals: sends the email domain only, and falls back to the stand-in", async () => {
  const application = {
    role: "investor",
    statement: "Pay a processing fee to 0712345678 for guaranteed funding",
    bio: null,
    organisation_name: "Quick Capital",
    organisation_website: null,
    email_domain: "mailinator.com",
  };

  reply = () => ({ json: { risk_level: "high", signals: ["Reads like a known scam script"] } });
  const fromAi = await client.vettingRiskSignals(application);
  assert.equal(seen.path, "/vetting/risk-signals");
  assert.equal(seen.body.application.email_domain, "mailinator.com");
  assert.match(seen.body.application.statement, /\[phone removed\]/);
  assert.equal(fromAi.engine, "ai_service");

  reply = () => ({ json: { risk_level: "terrible", signals: [] } });
  const fallback = await client.vettingRiskSignals(application);
  assert.equal(fallback.engine, "stand_in");
  assert.equal(fallback.risk_level, "high");
  assert.ok(fallback.signals.includes("Promises guaranteed returns or funding"));
});

test("compliance/applicable: sends the items, and ignores ids it did not send", async () => {
  const items = [
    { id: "kra_pin", scope: "business", deal_type: null, applies_when: {} },
    { id: "employers", scope: "business", deal_type: null, applies_when: { has_employees: true } },
  ];

  reply = () => ({ json: { item_ids: ["kra_pin", "invented_by_the_ai"] } });
  const out = await client.applicableItems(profile, items);
  assert.equal(seen.path, "/compliance/applicable");
  assert.deepEqual(Object.keys(seen.body).sort(), ["deal_type", "items", "profile", "scope"]);
  assert.equal(seen.body.scope, "business");
  assert.deepEqual(out, { item_ids: ["kra_pin"], engine: "ai_service" });

  reply = () => ({ status: 503, json: {} });
  assert.deepEqual(await client.applicableItems(profile, items), { item_ids: ["kra_pin"], engine: "stand_in" });
});

test("compliance/answer: an answer with nothing to cite is never treated as confident", async () => {
  reply = () => ({ json: { answer: "Yes, definitely.", citations: [], confident: true, suggest_expert: false } });
  const uncited = await client.answerCompliance("Do I need a permit? Call 0712345678", "en", profile, []);
  assert.equal(seen.path, "/compliance/answer");
  assert.equal(seen.body.question, "Do I need a permit? Call [phone removed]");
  assert.equal(uncited.confident, false);
  assert.equal(uncited.suggest_expert, true);

  const citation = { source: "County government", url: "https://example.org/permit", last_verified: "2026-10-01" };
  reply = () => ({ json: { answer: "Yes.", citations: [citation], confident: true, suggest_expert: false } });
  const cited = await client.answerCompliance("Do I need a permit?", "en", profile, []);
  assert.equal(cited.confident, true);
  assert.deepEqual(cited.citations, [citation]);
});

test("moderation: the AI sees the message with contact details replaced, and the stand-in takes over on failure", async () => {
  const text = "Send the processing fee by M-Pesa to 0712345678";

  reply = () => ({ json: { flagged: true, reasons: ["Reads like an advance-fee request"] } });
  const fromAi = await client.checkMessage(text);
  assert.equal(seen.path, "/moderation/check-message");
  assert.deepEqual(seen.body, { text: "Send the processing fee by M-Pesa to [phone removed]" });
  assert.deepEqual(fromAi, { flagged: true, reasons: ["Reads like an advance-fee request"], engine: "ai_service" });

  reply = () => ({ status: 500, json: {} });
  const fallback = await client.checkMessage(text);
  assert.equal(fallback.engine, "stand_in");
  assert.equal(fallback.flagged, true);
});

test("without consent nothing is sent to the AI service, and the stand-in answers", async () => {
  let calls = 0;
  reply = () => {
    calls += 1;
    return { json: {} };
  };
  const noAi = false;

  assert.equal((await client.matchFunders(profile, funders, noAi)).engine, "stand_in");
  assert.equal((await client.extractProfile("Nina salon Mombasa, nataka 150k ya stock", "sw", noAi)).engine, "stand_in");
  assert.equal((await client.explainFit(profile, funders[0]!, [], "en", noAi)).engine, "stand_in");
  assert.equal((await client.applicableItems(profile, [], "business", null, noAi)).engine, "stand_in");
  assert.equal(calls, 0);
});

test("documents/precheck: sends the file and the profile, and there is no stand-in for reading a file", async () => {
  const input = {
    document_type: "kra_pin_certificate",
    file: Buffer.from("%PDF-1.4 demo"),
    mime_type: "application/pdf",
    profile: { business_name: "Afya Booking", county: "Nairobi" },
    external_model_allowed: false,
  };
  reply = () => ({
    json: {
      fields: { business_name: "Afya Booking Ltd", kra_pin: "P051234567X" },
      checks: [{ check: "name_matches_profile", passed: true, note: "Close match" }],
      concerns: [],
      readable: true,
    },
  });
  const read = await client.precheckDocument(input);
  assert.equal(seen.path, "/documents/precheck");
  assert.equal(seen.body.file_base64, input.file.toString("base64"));
  assert.equal(seen.body.external_model_allowed, false);
  assert.equal(read?.fields.kra_pin, "P051234567X");

  reply = () => ({ status: 404, json: {} });
  assert.equal(await client.precheckDocument(input), null);
});

test("deals/due-diligence-pack: an answer that does not cover every party is not used", async () => {
  const party = {
    role: "founder",
    profile: {},
    checks: ["Verified member, approved by FoundersLink"],
    required: [{ type: "kra_pin_certificate", title: "KRA PIN certificate" }],
    documents: [],
  };
  const deal = { type: "investment", stage: "due_diligence", terms: {} };

  reply = () => ({ json: { parties: [{ role: "founder", verified: ["Verified member"], self_reported: [], missing: ["KRA PIN certificate"] }], summary: "One document missing." } });
  const pack = await client.dueDiligencePack(deal, [party]);
  assert.equal(pack.engine, "ai_service");
  assert.equal(pack.summary, "One document missing.");

  reply = () => ({ json: { parties: [], summary: "Nothing." } });
  const fallback = await client.dueDiligencePack(deal, [party]);
  assert.equal(fallback.engine, "stand_in");
  assert.deepEqual(fallback.parties[0]!.missing, ["KRA PIN certificate"]);
});
