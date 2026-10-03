// Reading a circle's M-Pesa payments (KENYA_AMENDMENTS 1), so the
// treasurer does not have to type each one in.
//
// FounderLink never touches the money. Members pay into the circle's
// own Paybill, Till or account, and this only reads what was paid: from
// rows of a statement the treasurer uploads, or from a confirmation
// Safaricom sends for the circle's Paybill.
//
// What is and is not verified:
// - The matching and reconciliation logic is tested.
// - The statement columns and the confirmation fields are written from
//   memory of Safaricom's formats. Neither has been run against a real
//   statement or the Daraja sandbox.
// - A real M-Pesa statement is a password-protected PDF. This reads
//   rows or CSV text, not that PDF.

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, forbidden, notFound } from "../../shared/errors.js";

const rowSchema = z.object({
  receipt: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,12}$/, "Not an M-Pesa receipt number"),
  completed_at: z.coerce.date(),
  details: z.string().trim().max(300),
  paid_in_kes: z.number().nonnegative(),
});

export const statementSchema = z
  .object({
    rows: z.array(z.unknown()).max(2000).optional(),
    // The statement's rows as CSV text, with a header line.
    csv: z.string().max(500_000).optional(),
  })
  .refine((s) => (s.rows === undefined) !== (s.csv === undefined), "Send either rows or csv");

export const resolveSchema = z
  .object({ member_id: z.uuid().optional(), ignore: z.literal(true).optional() })
  .refine((r) => (r.member_id === undefined) !== (r.ignore === undefined), "Send either member_id or ignore");

// --- Reading a statement ---

// Splits one CSV line, allowing commas inside double quotes.
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

const COLUMNS: Record<string, string[]> = {
  receipt: ["receiptno", "receipt", "receiptnumber", "transactionid"],
  completed_at: ["completiontime", "completedat", "date", "time"],
  details: ["details", "description"],
  paid_in_kes: ["paidin", "paidinkes", "amount", "credit"],
};

export function csvToRows(csv: string): Record<string, unknown>[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const at = Object.fromEntries(
    Object.entries(COLUMNS).map(([field, names]) => [field, header.findIndex((h) => names.includes(h))]),
  );
  const missing = Object.keys(at).filter((field) => at[field] === -1);
  if (missing.length > 0) {
    throw new AppError(400, "UNKNOWN_COLUMNS", `The statement needs columns for: ${missing.join(", ")}`);
  }

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const amount = Number((cells[at.paid_in_kes!] ?? "").replace(/,/g, ""));
    return {
      receipt: cells[at.receipt!],
      completed_at: cells[at.completed_at!],
      details: cells[at.details!],
      paid_in_kes: Number.isFinite(amount) ? amount : -1,
    };
  });
}

// Keeps a name readable but hides most of any phone number.
export const maskDigits = (text: string) => text.replace(/\d{7,}/g, (n) => `${"*".repeat(n.length - 3)}${n.slice(-3)}`);

interface Payer {
  user_id: string;
  full_name: string;
  phone: string | null;
}

// Which member a statement row belongs to: by her verified phone number
// if it appears (whole, or masked in the middle), otherwise by every
// word of her name. If two members could fit, nobody is chosen and the
// treasurer decides.
export function matchMember(details: string, members: Payer[]): string | null {
  const text = details.toLowerCase();
  const digits = details.replace(/[^\d*]/g, " ");

  const byPhone = members.filter((m) => {
    if (!m.phone) return false;
    const national = m.phone.slice(-9);
    if (digits.includes(national)) return true;
    // e.g. 2547******678 or 0712***678
    return [...digits.matchAll(/(\d{3,7})\*+(\d{2,4})/g)].some(([, start, end]) =>
      [`254${national}`, `0${national}`].some((form) => form.startsWith(start!) && form.endsWith(end!)),
    );
  });
  if (byPhone.length === 1) return byPhone[0]!.user_id;
  if (byPhone.length > 1) return null;

  const byName = members.filter((m) => {
    const words = m.full_name.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    return words.length >= 2 && words.every((w) => new RegExp(`\\b${w.replace(/[^a-z']/g, "")}\\b`).test(text));
  });
  return byName.length === 1 ? byName[0]!.user_id : null;
}

async function keeperOf(userId: string, circleId: string) {
  const row = await prisma.circleMember.findUnique({
    where: { circle_id_user_id: { circle_id: circleId, user_id: userId } },
    include: { circle: true },
  });
  if (!row) throw notFound("No such circle");
  if (row.role === "member") throw forbidden("Only the organiser or treasurer can do this");
  if (row.circle.type !== "money") throw conflict("NOT_A_MONEY_CIRCLE", "A learning circle has no contributions");
  return row;
}

async function payersOf(circleId: string): Promise<Payer[]> {
  const members = await prisma.circleMember.findMany({
    where: { circle_id: circleId },
    include: { user: { select: { full_name: true, phone: true, phone_verified_at: true } } },
  });
  // Only a verified number is trusted to say whose payment it is.
  return members.map((m) => ({ user_id: m.user_id, full_name: m.user.full_name, phone: m.user.phone_verified_at ? m.user.phone : null }));
}

// Reads the statement's rows into payment records. The upload itself is
// never stored: only the payments it describes.
export async function importStatement(userId: string, circleId: string, input: z.infer<typeof statementSchema>) {
  await keeperOf(userId, circleId);
  const raw = input.rows ?? csvToRows(input.csv!);
  const members = await payersOf(circleId);

  const known = new Set(
    (await prisma.paymentRecord.findMany({ where: { circle_id: circleId, mpesa_receipt: { not: null } }, select: { mpesa_receipt: true } })).map(
      (p) => p.mpesa_receipt,
    ),
  );

  const summary = { rows: raw.length, imported: 0, matched: 0, unmatched: 0, duplicates: 0, not_payments_in: 0, errors: [] as { row: number; message: string }[] };

  for (const [index, candidate] of raw.entries()) {
    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success) {
      summary.errors.push({ row: index + 1, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      continue;
    }
    const row = parsed.data;
    // A statement also lists money going out. Only money coming in is a contribution.
    if (row.paid_in_kes <= 0) {
      summary.not_payments_in += 1;
      continue;
    }
    // One receipt, one payment, however many times the statement is uploaded.
    if (known.has(row.receipt)) {
      summary.duplicates += 1;
      continue;
    }
    known.add(row.receipt);

    const memberId = matchMember(row.details, members);
    await prisma.paymentRecord.create({
      data: {
        circle_id: circleId,
        member_id: memberId,
        amount_kes: Math.round(row.paid_in_kes),
        paid_at: row.completed_at,
        mpesa_receipt: row.receipt,
        source: "statement",
        matched_status: memberId ? "matched" : "unmatched",
        payer_label: memberId ? null : maskDigits(row.details).slice(0, 120),
        recorded_by: userId,
      },
    });
    summary.imported += 1;
    summary[memberId ? "matched" : "unmatched"] += 1;
  }

  return summary;
}

// The treasurer says whose an unmatched payment is, or that it is not a
// contribution at all.
export async function resolvePayment(userId: string, circleId: string, paymentId: string, input: z.infer<typeof resolveSchema>) {
  await keeperOf(userId, circleId);
  const payment = await prisma.paymentRecord.findFirst({ where: { id: paymentId, circle_id: circleId, matched_status: "unmatched" } });
  if (!payment) throw notFound("No unmatched payment with this id");

  if (input.member_id) {
    const member = await prisma.circleMember.findUnique({
      where: { circle_id_user_id: { circle_id: circleId, user_id: input.member_id } },
    });
    if (!member) throw new AppError(400, "NOT_A_MEMBER", "That person is not a member of this circle");
  }

  const updated = await prisma.paymentRecord.update({
    where: { id: paymentId },
    data: input.member_id
      ? // Once it is matched, the label that helped identify it is no longer needed.
        { member_id: input.member_id, matched_status: "matched", payer_label: null }
      : { matched_status: "ignored" },
  });
  return { id: updated.id, matched_status: updated.matched_status, member_id: updated.member_id };
}

function periodStart(frequency: string, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (frequency === "weekly") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  else start.setUTCDate(1);
  return start;
}

// Where the circle stands for the current week or month: who has paid,
// who has not, and which payments nobody has been matched to.
export async function reconciliation(userId: string, circleId: string) {
  const mine = await prisma.circleMember.findUnique({
    where: { circle_id_user_id: { circle_id: circleId, user_id: userId } },
    include: { circle: true },
  });
  if (!mine) throw notFound("No such circle");
  const { circle } = mine;
  if (circle.type !== "money") throw conflict("NOT_A_MONEY_CIRCLE", "A learning circle has no contributions");

  const [members, payments] = await Promise.all([
    prisma.circleMember.findMany({ where: { circle_id: circleId }, include: { user: { select: { full_name: true } } }, orderBy: { joined_at: "asc" } }),
    prisma.paymentRecord.findMany({ where: { circle_id: circleId, matched_status: { not: "ignored" } }, orderBy: { paid_at: "desc" } }),
  ]);

  const amount = circle.contribution_amount_kes;
  const start = circle.contribution_frequency ? periodStart(circle.contribution_frequency) : null;
  const inPeriod = payments.filter((p) => p.matched_status === "matched" && (!start || p.paid_at >= start));

  const rows = members.map((m) => {
    const paid = inPeriod.filter((p) => p.member_id === m.user_id).reduce((t, p) => t + p.amount_kes, 0);
    return { user_id: m.user_id, full_name: m.user.full_name, paid_kes: paid, due_kes: amount ? Math.max(0, amount - paid) : 0 };
  });
  const unmatched = payments.filter((p) => p.matched_status === "unmatched");
  const keeper = mine.role !== "member";

  return {
    circle_id: circleId,
    period: start && { starts: start, frequency: circle.contribution_frequency, expected_per_member_kes: amount },
    collected_kes: rows.reduce((t, r) => t + r.paid_kes, 0),
    members: rows,
    missing: rows.filter((r) => r.due_kes > 0),
    by_source: Object.fromEntries(
      ["manual", "statement", "paybill_callback"].map((s) => [s, payments.filter((p) => p.source === s && p.matched_status === "matched").length]),
    ),
    unmatched_count: unmatched.length,
    // Who paid an unmatched payment may be someone outside the circle,
    // so only the organiser and treasurer see the details.
    unmatched: keeper
      ? unmatched.map((p) => ({ id: p.id, amount_kes: p.amount_kes, paid_at: p.paid_at, mpesa_receipt: p.mpesa_receipt, payer_label: p.payer_label, source: p.source }))
      : [],
  };
}

// --- Paybill confirmation from Safaricom (Daraja C2B) ---

export const confirmationSchema = z.object({
  TransID: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,12}$/),
  TransTime: z.string().regex(/^\d{14}$/),
  TransAmount: z.coerce.number().positive(),
  BusinessShortCode: z.coerce.string(),
  // What the payer typed as the account number. Members use their phone number.
  BillRefNumber: z.string().default(""),
  FirstName: z.string().optional(),
});

export function checkSecret(given: string) {
  const secret = env.MPESA_CALLBACK_SECRET;
  // With no secret configured the endpoint does not exist.
  if (!secret) throw notFound("No such endpoint");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw notFound("No such endpoint");
}

// Records a payment Safaricom says was made to a circle's own Paybill.
// The payer's phone number arrives hashed, so the member is found from
// the account number she typed. Anything else stays unmatched.
export async function recordConfirmation(input: z.infer<typeof confirmationSchema>) {
  const circle = await prisma.circle.findUnique({ where: { paybill_number: input.BusinessShortCode } });
  // Always answer "accepted": the money has already moved, and refusing
  // here would not undo it.
  const accepted = { ResultCode: 0, ResultDesc: "Accepted" };
  if (!circle) return accepted;

  const seen = await prisma.paymentRecord.findUnique({
    where: { circle_id_mpesa_receipt: { circle_id: circle.id, mpesa_receipt: input.TransID } },
  });
  if (seen) return accepted;

  const memberId = matchMember(input.BillRefNumber, await payersOf(circle.id));
  // TransTime is East Africa Time, three hours ahead of UTC.
  const t = input.TransTime;
  const paidAt = new Date(`${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}+03:00`);

  await prisma.paymentRecord.create({
    data: {
      circle_id: circle.id,
      member_id: memberId,
      amount_kes: Math.round(input.TransAmount),
      paid_at: paidAt,
      mpesa_receipt: input.TransID,
      source: "paybill_callback",
      matched_status: memberId ? "matched" : "unmatched",
      payer_label: memberId ? null : maskDigits(`${input.FirstName ?? ""} ${input.BillRefNumber}`.trim()).slice(0, 120),
      recorded_by: circle.created_by,
    },
  });
  return accepted;
}
