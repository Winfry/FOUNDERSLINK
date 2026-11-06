// Reports against a member, whether for one message or for the person.
// Reports from enough different members suspend the account until an
// admin has looked (TEAM_DECISIONS D7).

import { z } from "zod";
import { setApproved } from "../../realtime.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { REPORTED_REASON, setSuspended, tellMember } from "../vetting/vetting.service.js";

const REPORTS_TO_SUSPEND = 3;

export const userReportSchema = z.object({
  user_id: z.uuid(),
  reason: z.string().trim().min(5, "Say what happened").max(500),
});

// A report an admin dismissed as unfounded no longer counts against her.
const NOT_DISMISSED = { OR: [{ handled_outcome: null }, { handled_outcome: { not: "dismissed" } }] };

// Counted by different reporters, across both kinds of report, so one
// person cannot suspend another alone.
export async function suspendIfReported(userId: string): Promise<boolean> {
  const [byMessage, byUser] = await Promise.all([
    prisma.messageReport.findMany({
      where: { message: { sender_id: userId }, ...NOT_DISMISSED },
      distinct: ["reporter_id"],
      select: { reporter_id: true },
    }),
    prisma.userReport.findMany({ where: { reported_user_id: userId, ...NOT_DISMISSED }, select: { reporter_id: true } }),
  ]);
  const reporters = new Set([...byMessage, ...byUser].map((r) => r.reporter_id));
  if (reporters.size < REPORTS_TO_SUSPEND) return false;

  const { count } = await prisma.user.updateMany({
    where: { id: userId, approval_status: "approved" },
    data: { approval_status: "suspended" },
  });
  if (count === 0) return false;
  setApproved(userId, false);
  await tellMember(userId, { type: "account_suspended", title: "Your account is paused", body: REPORTED_REASON, link: "/vetting/application" });
  return true;
}

export async function reportUser(reporterId: string, input: z.infer<typeof userReportSchema>) {
  if (input.user_id === reporterId) throw new AppError(400, "INVALID_TARGET", "You cannot report yourself");
  const target = await prisma.user.findUnique({ where: { id: input.user_id }, select: { role: true, approval_status: true } });
  if (!target || target.role === "admin" || !["approved", "suspended"].includes(target.approval_status)) {
    throw notFound("No such member");
  }

  const already = await prisma.userReport.findUnique({
    where: { reporter_id_reported_user_id: { reporter_id: reporterId, reported_user_id: input.user_id } },
  });
  if (already) throw conflict("ALREADY_REPORTED", "You have already reported this member");

  await prisma.userReport.create({ data: { reporter_id: reporterId, reported_user_id: input.user_id, reason: input.reason } });
  return { user_id: input.user_id, reported: true, suspended: await suspendIfReported(input.user_id) };
}

// Whether and how an admin dealt with a report, with her name.
type Handled = { handled_at: Date | null; handled_by: string | null; handled_outcome: string | null; handled_note: string | null };

export async function handlingOf(reports: Handled[]) {
  const ids = [...new Set(reports.map((r) => r.handled_by).filter((id): id is string => id !== null))];
  const admins = new Map(
    (await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, full_name: true } })).map((a) => [a.id, a]),
  );
  return (r: Handled) =>
    r.handled_at
      ? { at: r.handled_at, by: admins.get(r.handled_by ?? "") ?? null, outcome: r.handled_outcome, note: r.handled_note }
      : null;
}

// Open reports first, then newest first.
export const openFirst = <T extends { handled: unknown; created_at: Date }>(a: T, b: T) =>
  Number(a.handled !== null) - Number(b.handled !== null) || b.created_at.getTime() - a.created_at.getTime();

// For admins: reports against members, open ones first.
export async function listUserReports() {
  const reports = await prisma.userReport.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      reporter: { select: { id: true, full_name: true } },
      reported: { select: { id: true, full_name: true, role: true, approval_status: true } },
    },
  });
  const handled = await handlingOf(reports);
  return reports
    .map((r) => ({ id: r.id, reason: r.reason, reporter: r.reporter, reported: r.reported, created_at: r.created_at, handled: handled(r) }))
    .sort(openFirst);
}

// --- Handling a report (FINAL_VERIFICATION 25) ---

export const resolveReportSchema = z.object({
  // Dismiss: it does not call for action. Suspend: pause the member it is about.
  outcome: z.enum(["dismiss", "suspend"]),
  reason: z.string().trim().min(5, "Give a reason").max(500),
});

export type ReportKind = "messages" | "members";

// Closes a report. Dismissing closes this one only, and it stops counting
// towards a suspension. Suspending pauses the member and closes every open
// report about her, since one decision answers them all. Either is in the
// audit log.
export async function resolveReport(adminId: string, kind: ReportKind, reportId: string, input: z.infer<typeof resolveReportSchema>) {
  const report =
    kind === "messages"
      ? await prisma.messageReport
          .findUnique({ where: { id: reportId }, select: { handled_at: true, message: { select: { sender_id: true } } } })
          .then((r) => r && { handled_at: r.handled_at, member_id: r.message.sender_id })
      : await prisma.userReport
          .findUnique({ where: { id: reportId }, select: { handled_at: true, reported_user_id: true } })
          .then((r) => r && { handled_at: r.handled_at, member_id: r.reported_user_id });
  if (!report) throw notFound("No such report");
  if (report.handled_at) throw conflict("ALREADY_HANDLED", "This report has already been handled");

  const handled = { handled_at: new Date(), handled_by: adminId, handled_note: input.reason };
  const memberId = report.member_id;

  if (input.outcome === "dismiss") {
    await prisma.$transaction([
      kind === "messages"
        ? prisma.messageReport.update({ where: { id: reportId }, data: { ...handled, handled_outcome: "dismissed" } })
        : prisma.userReport.update({ where: { id: reportId }, data: { ...handled, handled_outcome: "dismissed" } }),
      // A message whose sender has since deleted her account has nobody to
      // file the entry under; the report itself keeps who dismissed it and why.
      ...(memberId
        ? [prisma.adminAction.create({ data: { admin_id: adminId, action: "report_dismissed", target_user_id: memberId, reason: input.reason } })]
        : []),
    ]);
    return { id: reportId, handled: true, outcome: "dismissed" };
  }

  if (!memberId) throw conflict("MEMBER_GONE", "The member who sent this message has deleted her account. Dismiss the report instead");
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { approval_status: true } });
  if (member?.approval_status === "approved") {
    await setSuspended(adminId, memberId, true, input.reason);
  } else if (member?.approval_status === "suspended") {
    // The reports already paused her automatically; this is the admin's
    // decision to keep it that way, and it is recorded as such.
    await prisma.adminAction.create({
      data: { admin_id: adminId, action: "suspend_confirmed", target_user_id: memberId, reason: input.reason },
    });
  } else {
    throw conflict("WRONG_STATUS", "Only an approved or already paused member can be suspended");
  }
  await prisma.$transaction([
    prisma.messageReport.updateMany({
      where: { message: { sender_id: memberId }, handled_at: null },
      data: { ...handled, handled_outcome: "suspended" },
    }),
    prisma.userReport.updateMany({
      where: { reported_user_id: memberId, handled_at: null },
      data: { ...handled, handled_outcome: "suspended" },
    }),
  ]);
  return { id: reportId, handled: true, outcome: "suspended" };
}
