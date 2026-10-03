import assert from "node:assert/strict";
import { test } from "node:test";
import { redact } from "../src/ai/client.js";
import { extractProfile, matchFunders } from "../src/ai/standin.js";
import type { MatchFunder, MatchProfile } from "../src/ai/types.js";
import { assessReadiness, type ReadinessFunder } from "../src/modules/funding/readiness.js";

// Pure logic only: no database and no server.

const salon: MatchProfile = {
  journey_type: "sme",
  business_status: "informal",
  description: "Nina salon Mombasa, nataka stock mpya",
  sector: "retail",
  county: "Mombasa",
  funding_amount_kes: 150_000,
  use_of_funds: null,
  stage: null,
  instruments: [],
  months_trading: 18,
  monthly_revenue_band: "50k_to_200k",
  has_employees: false,
};

const bankLoan: MatchFunder = {
  id: "bank",
  kind: "bank",
  mandate_text: "Loans for registered small businesses",
  journey_types: ["sme"],
  sectors: [],
  stages: [],
  counties: [],
  instruments: ["loan"],
  ticket_min_kes: 100_000,
  ticket_max_kes: 5_000_000,
};

const ventureFund: MatchFunder = {
  ...bankLoan,
  id: "vc",
  kind: "vc",
  journey_types: ["startup"],
  sectors: ["fintech"],
  stages: ["growth"],
  instruments: ["equity"],
  ticket_min_kes: 10_000_000,
  ticket_max_kes: 60_000_000,
};

const noSideConditions: ReadinessFunder = {
  requirements: [],
  eligibility: [],
  application_fee_kes: 0,
  deadline: null,
  last_verified_at: new Date("2026-10-01"),
  is_demo: false,
};

const noAnswers = { already_have: [], women_owned: null, youth_owned: null, pwd_owned: null };
const items = new Map([["kra_pin", { title: "KRA PIN", source_url: null, last_verified_at: null }]]);

test("stand-in returns a verdict and reasons for every funder", () => {
  const [bank, vc] = matchFunders(salon, [bankLoan, ventureFund]);

  assert.equal(bank!.band, "strong");
  assert.match(bank!.explanation, /Funds small businesses.*within their range/);

  assert.equal(vc!.band, "not_a_fit");
  assert.match(vc!.explanation, /^Funds startups, not small businesses\./);
  const failed = vc!.reasons.filter((r) => !r.fits).map((r) => r.signal);
  assert.deepEqual(failed, ["journey", "sector", "stage", "amount"]);
  assert.match(vc!.reasons.find((r) => r.signal === "amount")!.text, /KSh 150,000.*minimum is KSh 10,000,000/);
});

test("soft misses lower the band but do not rule a funder out", () => {
  const band = (changes: Partial<MatchProfile>) => matchFunders({ ...salon, ...changes }, [bankLoan])[0]!.band;

  assert.equal(band({ instruments: ["grant"] }), "good");
  assert.equal(band({ funding_amount_kes: null }), "good");
  assert.equal(band({ instruments: ["grant"], funding_amount_kes: null }), "possible");
});

test("a missing requirement moves a fitting funder to apply_after", () => {
  const [match] = matchFunders(salon, [bankLoan]);
  const funder = { ...noSideConditions, requirements: ["kra_pin"] };

  const without = assessReadiness(noAnswers, funder, items, match!);
  assert.equal(without.group, "apply_after");
  assert.deepEqual(without.gaps.map((g) => [g.kind, g.ref, g.title]), [["requirement", "kra_pin", "KRA PIN"]]);

  const withPin = assessReadiness({ ...noAnswers, already_have: ["kra_pin"] }, funder, items, match!);
  assert.equal(withPin.group, "apply_now");
});

test("eligibility: yes fits, no rules out, unanswered asks the founder", () => {
  const [match] = matchFunders(salon, [bankLoan]);
  const funder = { ...noSideConditions, eligibility: ["women_owned"] };

  assert.equal(assessReadiness({ ...noAnswers, women_owned: true }, funder, items, match!).group, "apply_now");
  assert.equal(assessReadiness({ ...noAnswers, women_owned: false }, funder, items, match!).group, "not_for_you");

  const unanswered = assessReadiness(noAnswers, funder, items, match!);
  assert.equal(unanswered.group, "apply_after");
  assert.deepEqual(unanswered.gaps.map((g) => [g.kind, g.ref]), [["unanswered", "women_owned"]]);
});

test("an application fee is a risk factor and does not change the group", () => {
  const [match] = matchFunders(salon, [bankLoan]);
  const result = assessReadiness(noAnswers, { ...noSideConditions, application_fee_kes: 2500 }, items, match!);

  assert.equal(result.group, "apply_now");
  assert.deepEqual(result.risk_factors.map((r) => r.code), ["application_fee"]);
  assert.match(result.risk_factors[0]!.text, /KSh 2,500/);
});

test("demo, unverified and expired records are flagged", () => {
  const [match] = matchFunders(salon, [bankLoan]);
  const codes = (funder: ReadinessFunder) =>
    assessReadiness(noAnswers, funder, items, match!, new Date("2026-10-03")).risk_factors.map((r) => r.code);

  assert.deepEqual(codes(noSideConditions), []);
  assert.deepEqual(codes({ ...noSideConditions, is_demo: true }), ["demo_data"]);
  assert.deepEqual(codes({ ...noSideConditions, last_verified_at: null }), ["not_verified"]);
  assert.deepEqual(codes({ ...noSideConditions, deadline: new Date("2026-09-01") }), ["deadline_passed"]);
});

test("redact removes contact details and keeps business content", () => {
  const out = redact("Call 0712345678 or +254712345678, mail amina@example.co.ke. I need 1500000 for stock");
  assert.equal(out, "Call [phone removed] or [phone removed], mail [email removed]. I need 1500000 for stock");
});

test("stand-in extraction picks out what it can and lists the rest as unsure", () => {
  const sw = extractProfile("Nina salon Mombasa, nataka 150k ya stock");
  assert.deepEqual(sw.fields, { sector: "retail", county: "Mombasa", journey_type: "sme", funding_amount_kes: 150_000 });
  assert.deepEqual(sw.unsure, ["business_status"]);

  const en = extractProfile("We are building a clinic booking app in Nairobi and need KSh 1.5m");
  assert.deepEqual(en.fields, { sector: "health", county: "Nairobi", journey_type: "startup", funding_amount_kes: 1_500_000 });

  assert.equal(extractProfile("I need 2,500,000 shillings").fields.funding_amount_kes, 2_500_000);
});
