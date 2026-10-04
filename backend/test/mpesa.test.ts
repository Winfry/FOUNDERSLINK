import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { csvToRows, maskDigits, matchMember, readStatementDate } from "../src/modules/circles/mpesa.js";

// Reading a circle's M-Pesa payments. The statement layout and the
// confirmation fields here are our best knowledge of Safaricom's
// formats, not something checked against a real statement or the
// Daraja sandbox.

// --- Matching on its own: no database, no server ---

const members = [
  { user_id: "achieng", full_name: "Achieng Atieno", phone: "+254712345678" },
  { user_id: "mumbi", full_name: "Mumbi Wanjiru", phone: null },
  { user_id: "mumbi2", full_name: "Mumbi Njeri", phone: null },
];

test("a payment is matched by a verified phone number, whole or masked", () => {
  assert.equal(matchMember("Funds received from 254712345678 A ATIENO", members), "achieng");
  assert.equal(matchMember("Funds received from 0712345678", members), "achieng");
  assert.equal(matchMember("Funds received from 2547******678 SOMEONE", members), "achieng");
  assert.equal(matchMember("Funds received from 2547******999 SOMEONE", members), null);
});

test("without a phone match it is matched by full name, and never guessed", () => {
  assert.equal(matchMember("Funds received from 2547******111 MUMBI WANJIRU", members), "mumbi");
  // A first name alone fits two members, so the treasurer decides.
  assert.equal(matchMember("Funds received from MUMBI", members), null);
  assert.equal(matchMember("Funds received from JOHN DOE", members), null);
});

test("statement text is read by column name, with commas inside quotes and in amounts", () => {
  const rows = csvToRows(
    [
      "Receipt No.,Completion Time,Details,Transaction Status,Paid In,Withdrawn,Balance",
      'SJ11AAAA01,2026-10-01 14:03:22,"Funds received from 2547******678, ACHIENG",Completed,"2,000.00",,"5,000.00"',
      "SJ11AAAA02,2026-10-02 09:00:00,Pay Bill to 888880,Completed,,500.00,4500.00",
    ].join("\n"),
  );
  assert.deepEqual(rows[0], {
    receipt: "SJ11AAAA01",
    completed_at: "2026-10-01 14:03:22",
    details: "Funds received from 2547******678, ACHIENG",
    paid_in_kes: 2000,
  });
  assert.equal(rows[1]!.paid_in_kes, 0);
  assert.throws(() => csvToRows("Date,Notes\n2026-10-01,hello"), /needs columns for: receipt, details, paid_in_kes/);
});

test("phone numbers are masked in anything kept about an unmatched payer", () => {
  assert.equal(maskDigits("Funds received from 254712345678 JOHN DOE"), "Funds received from *********678 JOHN DOE");
});

test("a date with the day first is read the Kenyan way, as East Africa Time", () => {
  // 4 October, not 10 April. 13:00 in Nairobi is 10:00 UTC.
  assert.equal(readStatementDate("04-10-2026 13:00:00")?.toISOString(), "2026-10-04T10:00:00.000Z");
  assert.equal(readStatementDate("04/10/2026 13:00")?.toISOString(), "2026-10-04T10:00:00.000Z");
  // A day past the 12th cannot be a month, and used to be refused.
  assert.equal(readStatementDate("13/10/2026 13:00")?.toISOString(), "2026-10-13T10:00:00.000Z");
  assert.equal(readStatementDate("4/1/2026")?.toISOString(), "2026-01-03T21:00:00.000Z");
});

test("a date with the year first still works, and anything unclear is refused, not guessed", () => {
  assert.equal(readStatementDate("2026-10-04T10:00:00.000Z")?.toISOString(), "2026-10-04T10:00:00.000Z");
  assert.equal(readStatementDate("2026-10-04 13:00:00")?.getTime(), new Date("2026-10-04 13:00:00").getTime());

  for (const unreadable of ["31-02-2026 10:00", "04-13-2026 10:00", "04-10-26", "04-10-2026 25:00", "yesterday", "", null, 20261004]) {
    assert.equal(readStatementDate(unreadable), null, String(unreadable));
  }
});

// --- The API ---

const run = Date.now();
const password = "correct-horse-battery";
// The same value test/setup.ts puts in the environment.
const secret = "test-callback-secret-0123456789";
const people = { wanjiku: "Wanjiku Organiser", achieng: "Achieng Friend", mumbi: "Mumbi Friend" } as const;
type Who = keyof typeof people;
const digits = String(run).slice(-8);
const achiengPhone = `+2547${digits}`;
const paybill = `7${String(run).slice(-5)}`;
const receipt = (n: number) => `T${String(run).slice(-7)}${String(n).padStart(2, "0")}`;

let app: typeof import("../src/app.js").app;
let prisma: typeof import("../src/shared/db.js").prisma;
let base = "";
let server: ReturnType<typeof import("../src/app.js").app.listen>;
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let circle = "";

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

const now = new Date(Date.now() - 60_000).toISOString();
const statement = [
  "Receipt No.,Completion Time,Details,Transaction Status,Paid In,Withdrawn,Balance",
  `${receipt(1)},${now},"Funds received from 2547******${digits.slice(-3)} A FRIEND",Completed,"2,000.00",,`,
  `${receipt(2)},${now},Funds received from 254711***999 MUMBI FRIEND,Completed,"1,500.00",,`,
  `${receipt(3)},${now},Funds received from 254700111222 JOHN DOE,Completed,700.00,,`,
  `${receipt(4)},${now},Pay Bill to 888880 KPLC,Completed,,500.00,`,
  `bad,${now},Funds received from someone,Completed,100.00,,`,
].join("\n");

before(async () => {
  ({ app } = await import("../src/app.js"));
  ({ prisma } = await import("../src/shared/db.js"));

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const password_hash = await bcrypt.hash(password, 4);
  for (const who of Object.keys(people) as Who[]) {
    const email = `mpesa-${who}-${run}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        full_name: people[who],
        role: "founder",
        password_hash,
        approval_status: "approved",
        // Achieng's number is verified, so it can be used to match her payments.
        ...(who === "achieng" ? { phone: achiengPhone, phone_verified_at: new Date() } : {}),
      },
    });
    ids[who] = user.id;
    tokens[who] = (await call("POST", "/auth/login", undefined, { email, password })).json.token;
  }

  const made = await call("POST", "/circles", "wanjiku", {
    name: `Statement Savers ${run}`,
    type: "money",
    contribution_amount_kes: 2000,
    contribution_frequency: "monthly",
  });
  circle = made.json.id;
  for (const who of ["achieng", "mumbi"] as const) {
    const invite = await call("POST", `/circles/${circle}/invites`, "wanjiku");
    await call("POST", "/circles/join", who, { token: invite.json.token });
  }
});

after(async () => {
  await prisma.circle.deleteMany({ where: { id: circle } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
  server.close();
});

test("the treasurer uploads a statement, and each payment in is matched or set aside", async () => {
  assert.equal((await call("POST", `/circles/${circle}/statements`, "mumbi", { csv: statement })).status, 403);
  assert.equal((await call("POST", `/circles/${circle}/statements`, "wanjiku", {})).status, 400);

  const summary = await call("POST", `/circles/${circle}/statements`, "wanjiku", { csv: statement });
  assert.equal(summary.status, 200);
  assert.deepEqual(
    { ...summary.json, errors: summary.json.errors.length },
    { rows: 5, imported: 3, matched: 2, unmatched: 1, duplicates: 0, not_payments_in: 1, errors: 1 },
  );
  assert.equal(summary.json.errors[0].row, 5);
});

test("a statement much larger than an ordinary request is accepted", async () => {
  const padding = Array.from({ length: 3000 }, (_, i) => `ZZ${String(i).padStart(8, "0")},${now},Pay Bill to 888880 KPLC,Completed,,10.00,`).join("\n");
  const big = `${statement}\n${padding}`;
  assert.ok(big.length > 150_000);
  const res = await call("POST", `/circles/${circle}/statements`, "wanjiku", { csv: big });
  assert.equal(res.status, 200);
  assert.equal(res.json.not_payments_in, 3001);
});

test("uploading the same statement again counts nothing twice", async () => {
  const again = await call("POST", `/circles/${circle}/statements`, "wanjiku", { csv: statement });
  assert.equal(again.json.imported, 0);
  assert.equal(again.json.duplicates, 3);
  assert.equal((await call("GET", `/circles/${circle}`, "wanjiku")).json.total_contributed_kes, 3500);
});

test("the reconciliation shows who has paid, who still owes, and what is unmatched", async () => {
  const view = (await call("GET", `/circles/${circle}/reconciliation`, "wanjiku")).json;

  assert.equal(view.collected_kes, 3500);
  assert.deepEqual(
    view.members.map((m: any) => [m.full_name, m.paid_kes, m.due_kes]),
    [
      ["Wanjiku Organiser", 0, 2000],
      ["Achieng Friend", 2000, 0],
      ["Mumbi Friend", 1500, 500],
    ],
  );
  assert.deepEqual(view.missing.map((m: any) => m.full_name), ["Wanjiku Organiser", "Mumbi Friend"]);
  assert.equal(view.by_source.statement, 2);

  // The stranger's phone number is masked in what we keep.
  assert.equal(view.unmatched.length, 1);
  assert.equal(view.unmatched[0].payer_label, "Funds received from *********222 JOHN DOE");

  // An ordinary member sees that something is unmatched, not who paid it.
  const members = (await call("GET", `/circles/${circle}/reconciliation`, "mumbi")).json;
  assert.equal(members.unmatched_count, 1);
  assert.deepEqual(members.unmatched, []);
});

test("the treasurer says whose an unmatched payment is, or that it is not a contribution", async () => {
  const [stray] = (await call("GET", `/circles/${circle}/reconciliation`, "wanjiku")).json.unmatched;
  const resolve = (who: Who, body: object) => call("PATCH", `/circles/${circle}/payments/${stray.id}`, who, body);

  assert.equal((await resolve("mumbi", { member_id: ids.wanjiku })).status, 403);
  assert.equal((await resolve("wanjiku", {})).status, 400);

  const matched = await resolve("wanjiku", { member_id: ids.wanjiku });
  assert.equal(matched.json.matched_status, "matched");
  // The label that identified the payer is dropped once it is matched.
  assert.equal((await prisma.paymentRecord.findUniqueOrThrow({ where: { id: stray.id } })).payer_label, null);
  assert.equal((await call("GET", `/circles/${circle}`, "wanjiku")).json.total_contributed_kes, 4200);
  assert.equal((await resolve("wanjiku", { ignore: true })).status, 404);
});

test("a Paybill confirmation records the payment, once, behind a secret", async () => {
  await call("PATCH", `/circles/${circle}`, "wanjiku", { paybill_number: paybill });
  const confirmation = {
    TransactionType: "Pay Bill",
    TransID: receipt(9),
    TransTime: "20261003143000",
    TransAmount: "500.00",
    BusinessShortCode: paybill,
    BillRefNumber: `07${digits}`,
    MSISDN: "a-hashed-phone-number",
    FirstName: "ACHIENG",
  };

  assert.equal((await call("POST", "/payments/mpesa/callback/wrong-secret-0123456789", undefined, confirmation)).status, 404);

  const accepted = await call("POST", `/payments/mpesa/callback/${secret}`, undefined, confirmation);
  assert.deepEqual(accepted.json, { ResultCode: 0, ResultDesc: "Accepted" });
  // Safaricom may send the same confirmation twice.
  await call("POST", `/payments/mpesa/callback/${secret}`, undefined, confirmation);

  const recorded = await prisma.paymentRecord.findMany({ where: { circle_id: circle, source: "paybill_callback" } });
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0]!.member_id, ids.achieng);
  assert.equal(recorded[0]!.amount_kes, 500);
  // 14:30 East Africa Time is 11:30 UTC.
  assert.equal(recorded[0]!.paid_at.toISOString(), "2026-10-03T11:30:00.000Z");

  // A confirmation for a Paybill we do not know is accepted and changes nothing.
  const other = await call("POST", `/payments/mpesa/callback/${secret}`, undefined, { ...confirmation, TransID: receipt(8), BusinessShortCode: "000001" });
  assert.equal(other.json.ResultCode, 0);
  assert.equal(await prisma.paymentRecord.count({ where: { mpesa_receipt: receipt(8) } }), 0);
});

test("a statement with day-first dates is imported on the right day, and an unreadable date names its row", async () => {
  const res = await call("POST", `/circles/${circle}/statements`, "wanjiku", {
    csv: [
      "Receipt No.,Completion Time,Details,Paid In",
      `${receipt(20)},04-10-2026 13:00:00,Funds received from JANE DOE,300.00`,
      `${receipt(21)},13/10/2026 13:00,Funds received from JANE DOE,300.00`,
      `${receipt(22)},31-02-2026 13:00,Funds received from JANE DOE,300.00`,
    ].join("\n"),
  });
  assert.equal(res.json.imported, 2);
  assert.deepEqual(res.json.errors, [
    { row: 3, message: 'Row 3: the date "31-02-2026 13:00" could not be read. Write it with the day first, like 04-10-2026 13:00' },
  ]);

  const saved = await prisma.paymentRecord.findMany({ where: { circle_id: circle, mpesa_receipt: { in: [receipt(20), receipt(21)] } }, orderBy: { paid_at: "asc" } });
  assert.deepEqual(saved.map((p) => p.paid_at.toISOString()), ["2026-10-04T10:00:00.000Z", "2026-10-13T10:00:00.000Z"]);
});
