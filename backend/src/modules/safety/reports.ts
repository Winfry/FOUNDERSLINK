// Reports against a member, whether for one message or for the person.
// Reports from enough different members suspend the account until an
// admin has looked (TEAM_DECISIONS D7).

import { z } from "zod";
import { disconnect } from "../../realtime.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";

const REPORTS_TO_SUSPEND = 3;

export const userReportSchema = z.object({
  user_id: z.uuid(),
  reason: z.string().trim().min(5, "Say what happened").max(500),
});

// Counted by different reporters, across both kinds of report, so one
// person cannot suspend another alone.
export async function suspendIfReported(userId: string): Promise<boolean> {
  const [byMessage, byUser] = await Promise.all([
    prisma.messageReport.findMany({ where: { message: { sender_id: userId } }, distinct: ["reporter_id"], select: { reporter_id: true } }),
    prisma.userReport.findMany({ where: { reported_user_id: userId }, select: { reporter_id: true } }),
  ]);
  const reporters = new Set([...byMessage, ...byUser].map((r) => r.reporter_id));
  if (reporters.size < REPORTS_TO_SUSPEND) return false;

  const { count } = await prisma.user.updateMany({
    where: { id: userId, approval_status: "approved" },
    data: { approval_status: "suspended" },
  });
  if (count > 0) disconnect(userId);
  return count > 0;
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

// For admins: reports against members, newest first.
export async function listUserReports() {
  const reports = await prisma.userReport.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      reporter: { select: { id: true, full_name: true } },
      reported: { select: { id: true, full_name: true, role: true, approval_status: true } },
    },
  });
  return reports.map((r) => ({ id: r.id, reason: r.reason, reporter: r.reporter, reported: r.reported, created_at: r.created_at }));
}
