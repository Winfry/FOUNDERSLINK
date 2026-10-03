// What the admin dashboard needs beyond the vetting queue: every member
// with her status, one member in detail with her history, every
// application including decided ones, and the numbers for the dashboard.
//
// Admins see members' contact details, because checking them is their
// job. Password hashes and two-step secrets are never returned.

import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../shared/db.js";
import { conflict, notFound } from "../../shared/errors.js";

const STATUSES = ["draft", "submitted", "in_review", "needs_info", "approved", "rejected", "suspended", "banned"] as const;

const paging = {
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
};

export const usersQuery = z.object({
  role: z.enum(["founder", "investor", "expert"]).optional(),
  status: z.enum(STATUSES).optional(),
  // Looks in the name and the email address.
  search: z.string().trim().max(80).optional(),
  ...paging,
});

export const applicationsQuery = z.object({
  role: z.enum(["founder", "investor", "expert"]).optional(),
  status: z.enum(STATUSES).optional(),
  ...paging,
});

const page = <T>(items: T[], total: number, q: { page: number; page_size: number }) => ({
  items,
  total,
  page: q.page,
  page_size: q.page_size,
  pages: Math.ceil(total / q.page_size),
});

export async function listUsers(q: z.infer<typeof usersQuery>) {
  const where = {
    // Admins have their own list.
    role: q.role ?? { not: "admin" as const },
    ...(q.status ? { approval_status: q.status } : {}),
    ...(q.search
      ? { OR: [{ full_name: { contains: q.search, mode: "insensitive" as const } }, { email: { contains: q.search, mode: "insensitive" as const } }] }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (q.page - 1) * q.page_size,
      take: q.page_size,
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        approval_status: true,
        created_at: true,
        founder_profile: { select: { business_name: true, sector: true, county: true } },
        investor_profile: { select: { organisation_name: true } },
        expert_profile: { select: { profession: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items = rows.map(({ founder_profile, investor_profile, expert_profile, ...user }) => ({
    ...user,
    // One line that says who this is, whatever her role.
    summary: founder_profile?.business_name ?? investor_profile?.organisation_name ?? expert_profile?.profession ?? null,
    sector: founder_profile?.sector ?? null,
    county: founder_profile?.county ?? null,
  }));
  return page(items, total, q);
}

// One member, with everything an admin needs to judge her standing.
export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      full_name: true,
      email: true,
      email_verified_at: true,
      phone: true,
      phone_verified_at: true,
      role: true,
      approval_status: true,
      created_at: true,
      founder_profile: true,
      investor_profile: true,
      expert_profile: true,
      funder: true,
      vetting_application: { include: { checks: true } },
      consents: { select: { purpose: true, granted: true } },
    },
  });
  if (!user || user.role === "admin") throw notFound("No such member");

  const [actions, messageReports, userReports, deals, circles] = await Promise.all([
    prisma.adminAction.findMany({
      where: { target_user_id: userId },
      include: { admin: { select: { full_name: true } } },
      orderBy: { created_at: "asc" },
    }),
    prisma.messageReport.count({ where: { message: { sender_id: userId } } }),
    prisma.userReport.count({ where: { reported_user_id: userId } }),
    prisma.dealParty.count({ where: { user_id: userId } }),
    prisma.circleMember.count({ where: { user_id: userId } }),
  ]);

  // Her history in order: when she joined, applied, and what admins decided.
  const application = user.vetting_application;
  const timeline = [
    { at: user.created_at, event: "joined", text: "Signed up", by: null as string | null, reason: null as string | null },
    ...(application?.submitted_at
      ? [{ at: application.submitted_at, event: "applied", text: "Submitted her application", by: null, reason: null }]
      : []),
    ...actions.map((a) => ({ at: a.created_at, event: a.action, text: a.action.replaceAll("_", " "), by: a.admin.full_name, reason: a.reason })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    ...user,
    reports_against: { messages: messageReports, member: userReports },
    activity: { deals, circles },
    timeline,
  };
}

// Every application, waiting or decided. The queue at
// GET /admin/vetting/queue is the waiting ones, sorted by risk.
export async function listApplications(q: z.infer<typeof applicationsQuery>) {
  const where = {
    submitted_at: { not: null },
    user: { ...(q.role ? { role: q.role } : {}), ...(q.status ? { approval_status: q.status } : {}) },
  };
  const [rows, total] = await Promise.all([
    prisma.vettingApplication.findMany({
      where,
      orderBy: { submitted_at: "desc" },
      skip: (q.page - 1) * q.page_size,
      take: q.page_size,
      include: { user: { select: { id: true, full_name: true, email: true, role: true, approval_status: true } } },
    }),
    prisma.vettingApplication.count({ where }),
  ]);

  const items = rows.map((a) => ({
    id: a.id,
    user: a.user,
    status: a.user.approval_status,
    risk_level: a.risk_level,
    risk_signals: a.risk_signals,
    organisation_name: a.organisation_name,
    submitted_at: a.submitted_at,
    decided_at: a.decided_at,
    decision_reason: a.decision_reason,
  }));
  return page(items, total, q);
}

const MONTHS = 6;

// The numbers on the dashboard's first page.
export async function getStats(now = new Date()) {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));

  const [byRole, byStatus, waiting, recent, deals, circles, messageReports, userReports, rechecks] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { role: { not: "admin" } }, _count: true }),
    prisma.user.groupBy({ by: ["approval_status"], where: { role: { not: "admin" } }, _count: true }),
    prisma.user.count({ where: { approval_status: { in: ["submitted", "in_review"] } } }),
    prisma.user.findMany({ where: { role: { not: "admin" }, created_at: { gte: since } }, select: { created_at: true, role: true } }),
    prisma.deal.groupBy({ by: ["stage"], _count: true }),
    prisma.circle.groupBy({ by: ["type"], _count: true }),
    prisma.messageReport.count(),
    prisma.userReport.count(),
    prisma.vettingApplication.count({ where: { recheck_due_at: { lte: now }, user: { approval_status: "approved" } } }),
  ]);

  const count = <K extends string>(rows: ({ _count: number } & Record<K, string>)[], key: K) =>
    Object.fromEntries(rows.map((r) => [r[key], r._count]));

  // Sign-ups for each of the last six months, including months with none.
  const registrations = Array.from({ length: MONTHS }, (_, i) => {
    const month = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    const key = month.toISOString().slice(0, 7);
    const inMonth = recent.filter((u) => u.created_at.toISOString().slice(0, 7) === key);
    return {
      month: key,
      founders: inMonth.filter((u) => u.role === "founder").length,
      investors: inMonth.filter((u) => u.role === "investor").length,
      experts: inMonth.filter((u) => u.role === "expert").length,
    };
  });

  return {
    members: { total: byRole.reduce((t, r) => t + r._count, 0), by_role: count(byRole, "role"), by_status: count(byStatus, "approval_status") },
    applications_waiting: waiting,
    rechecks_due: rechecks,
    reports: { messages: messageReports, members: userReports },
    deals: { total: deals.reduce((t, d) => t + d._count, 0), by_stage: count(deals, "stage") },
    circles: { total: circles.reduce((t, c) => t + c._count, 0), by_type: count(circles, "type") },
    registrations,
  };
}

// --- Admin accounts ---

export const newAdminSchema = z.object({
  email: z.email().toLowerCase(),
  full_name: z.string().trim().min(2),
  password: z.string().min(12, "Use at least 12 characters for an admin"),
});

const adminFields = { id: true, full_name: true, email: true, totp_enabled: true, approval_status: true, created_at: true } as const;

export function listAdmins() {
  return prisma.user.findMany({ where: { role: "admin" }, select: adminFields, orderBy: { created_at: "asc" } });
}

// An admin makes another admin. It is the only way to become one from
// inside the app, and it is written to the audit log with who did it.
export async function createAdmin(byAdminId: string, input: z.infer<typeof newAdminSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("EMAIL_TAKEN", "An account with this email already exists");

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        full_name: input.full_name,
        role: "admin",
        approval_status: "approved",
        password_hash: await bcrypt.hash(input.password, 10),
      },
      select: adminFields,
    });
    await tx.adminAction.create({
      data: { admin_id: byAdminId, action: "create_admin", target_user_id: created.id, reason: `Created admin account for ${input.full_name}` },
    });
    return created;
  });
}
