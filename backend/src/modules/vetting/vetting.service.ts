// Vetting (TEAM_DECISIONS D7): nobody appears to other members until an
// admin has approved them. The AI only sorts the queue and says what to
// look at. Every decision is made by a person, with a written reason.

import { z } from "zod";
import { vettingRiskSignals } from "../../ai/client.js";
import type { RiskLevel } from "../../ai/types.js";
import { env } from "../../config/env.js";
import { CHECK_METHODS, CHECK_TYPES } from "../../shared/constants.js";
import { setApproved } from "../../realtime.js";
import { notify } from "../notifications/notifications.service.js";
import { listDocuments, scheduleDeletion } from "./documents.js";
import { prisma } from "../../shared/db.js";
import { kenyanMobile } from "../../shared/phone.js";
import { sendEmail } from "../../shared/email.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";

export const applicationSchema = z.object({
  // Stored in one form, so the same number on two accounts is noticed
  // however each was typed.
  phone: kenyanMobile.optional(),
  organisation_name: z.string().trim().min(2).max(120).optional(),
  organisation_website: z.url().optional(),
  statement: z.string().trim().min(20, "Tell us a little more").max(2000).optional(),
  references: z.string().trim().max(1000).optional(),
  claims_funder_id: z.uuid().nullable().optional(),
});

export const decisionSchema = z.object({
  decision: z.enum(["approve", "reject", "needs_info"]),
  reason: z.string().trim().min(5, "Give a reason for the decision"),
  checks: z
    .array(
      z.object({
        check_type: z.enum(CHECK_TYPES),
        result: z.enum(["pass", "fail"]),
        method: z.enum(CHECK_METHODS).default("manual"),
      }),
    )
    .default([]),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(5, "Give a reason"),
});

// A person may edit and submit only before a decision, or when asked for more.
const EDITABLE = ["draft", "needs_info"];
const AWAITING_DECISION = ["submitted", "in_review"];

async function statusOf(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { approval_status: true, role: true, email: true, funder: { select: { id: true } } },
  });
  return user;
}

export async function getApplication(userId: string) {
  const [user, application] = await Promise.all([
    statusOf(userId),
    prisma.vettingApplication.findUnique({ where: { user_id: userId }, include: { checks: true } }),
  ]);
  return {
    approval_status: user.approval_status,
    application,
    documents: application ? await listDocuments(application.id) : [],
    identity_check: "For this demo, identity is reviewed by an admin by hand. No ID number or document is stored.",
  };
}

export async function saveApplication(userId: string, input: z.infer<typeof applicationSchema>) {
  const user = await statusOf(userId);
  if (!EDITABLE.includes(user.approval_status)) {
    throw conflict("APPLICATION_LOCKED", "Your application has been submitted and cannot be changed now");
  }

  if (input.claims_funder_id) {
    if (user.role !== "investor") throw new AppError(403, "FORBIDDEN", "Only investors can claim a funder record");
    if (user.funder) throw conflict("ALREADY_HAS_FUNDER", "You already maintain a funder record");
    const funder = await prisma.funder.findUnique({ where: { id: input.claims_funder_id } });
    if (!funder) throw notFound("No such funder record");
    if (funder.claimed_by_user_id) throw conflict("FUNDER_CLAIMED", "Someone already maintains this record");
  }

  return prisma.vettingApplication.upsert({
    where: { user_id: userId },
    create: { ...input, user_id: userId },
    update: input,
  });
}

const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
const higher = (a: RiskLevel, b: RiskLevel) => (rank[a]! <= rank[b]! ? a : b);

export async function submitApplication(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { vetting_application: true, investor_profile: true, expert_profile: true },
  });
  if (!EDITABLE.includes(user.approval_status)) {
    throw conflict("APPLICATION_LOCKED", "Your application has already been submitted");
  }
  // The decision is sent to this address, so it has to be hers.
  if (!user.email_verified_at) {
    throw conflict("EMAIL_NOT_VERIFIED", "Verify your email address before submitting your application");
  }
  const application = user.vetting_application;
  if (!application?.statement || !application.phone) {
    throw new AppError(400, "APPLICATION_INCOMPLETE", "Add your phone number and a short statement before submitting");
  }
  if (user.role === "investor" && !application.organisation_name) {
    throw new AppError(400, "APPLICATION_INCOMPLETE", "Investors must say which organisation they invest for");
  }

  const ai = await vettingRiskSignals({
    role: user.role,
    statement: application.statement,
    bio: user.investor_profile?.bio ?? user.expert_profile?.bio ?? null,
    organisation_name: application.organisation_name,
    organisation_website: application.organisation_website,
    email_domain: user.email.split("@")[1] ?? "",
  });

  // The one signal that needs the database, so the backend checks it itself.
  let level = ai.risk_level;
  const signals = [...ai.signals];
  const samePhone = await prisma.vettingApplication.count({
    where: { phone: application.phone, user_id: { not: userId } },
  });
  if (samePhone > 0) {
    signals.push("The same phone number is used on another account");
    level = higher(level, "medium");
  }

  const [saved] = await prisma.$transaction([
    prisma.vettingApplication.update({
      where: { id: application.id },
      data: { risk_level: level, risk_signals: signals, submitted_at: new Date() },
    }),
    prisma.user.update({ where: { id: userId }, data: { approval_status: "submitted" } }),
  ]);

  return { approval_status: "submitted", application: saved };
}

const applicant = {
  select: { id: true, full_name: true, email: true, role: true, approval_status: true },
} as const;

// Highest risk first, then the longest wait.
export async function getQueue() {
  const applications = await prisma.vettingApplication.findMany({
    where: { user: { approval_status: { in: ["submitted", "in_review"] } } },
    include: { user: applicant },
  });
  return applications.sort(
    (a, b) =>
      (rank[a.risk_level ?? "low"] ?? 2) - (rank[b.risk_level ?? "low"] ?? 2) ||
      (a.submitted_at?.getTime() ?? 0) - (b.submitted_at?.getTime() ?? 0),
  );
}

export async function getApplicationForReview(applicationId: string) {
  const application = await prisma.vettingApplication.findUnique({
    where: { id: applicationId },
    include: {
      checks: true,
      user: {
        select: {
          ...applicant.select,
          founder_profile: true,
          investor_profile: true,
          expert_profile: true,
          funder: true,
        },
      },
    },
  });
  if (!application) throw notFound("No such application");

  if (application.user.approval_status === "submitted") {
    await prisma.user.update({ where: { id: application.user_id }, data: { approval_status: "in_review" } });
    application.user.approval_status = "in_review";
  }

  const claims = application.claims_funder_id
    ? await prisma.funder.findUnique({
        where: { id: application.claims_funder_id },
        select: { id: true, name: true, source_url: true, claimed_by_user_id: true },
      })
    : null;

  return { ...application, claims_funder: claims, documents: await listDocuments(application.id) };
}

const STATUS_AFTER = { approve: "approved", reject: "rejected", needs_info: "needs_info" } as const;

// How many different admins must approve an investor. Investors get the
// strictest check because fake investors are the most common scam. An
// object, so tests can turn the rule on without restarting.
export const vettingRules = { investorApprovals: env.INVESTOR_APPROVALS_REQUIRED };

const YEAR = 365 * 24 * 60 * 60 * 1000;

export async function decide(adminId: string, applicationId: string, input: z.infer<typeof decisionSchema>) {
  const application = await prisma.vettingApplication.findUnique({
    where: { id: applicationId },
    include: { user: { select: { approval_status: true, role: true, funder: { select: { id: true } } } } },
  });
  if (!application) throw notFound("No such application");
  if (!AWAITING_DECISION.includes(application.user.approval_status)) {
    throw conflict("NOT_AWAITING_DECISION", "This application is not waiting for a decision");
  }

  // The four-eyes rule: with two approvals required, the first admin's
  // yes is recorded and the application waits for a second, different admin.
  const needsTwo = input.decision === "approve" && application.user.role === "investor" && vettingRules.investorApprovals >= 2;
  if (needsTwo && application.first_approved_by === adminId) {
    throw conflict("SAME_ADMIN", "A second, different admin must give the final approval for an investor");
  }
  if (needsTwo && !application.first_approved_by) {
    await prisma.$transaction([
      prisma.vettingApplication.update({ where: { id: applicationId }, data: { first_approved_by: adminId } }),
      prisma.user.update({ where: { id: application.user_id }, data: { approval_status: "in_review" } }),
      prisma.vettingCheck.createMany({
        data: input.checks.map((c) => ({ ...c, application_id: applicationId, checked_by: adminId })),
      }),
      prisma.adminAction.create({
        data: { admin_id: adminId, action: "approve_first", target_user_id: application.user_id, reason: input.reason },
      }),
    ]);
    return { application_id: applicationId, approval_status: "in_review", approvals: { given: 1, needed: 2 } };
  }

  const status = STATUS_AFTER[input.decision];

  await prisma.$transaction(async (tx) => {
    await tx.vettingApplication.update({
      where: { id: applicationId },
      data: {
        decided_at: new Date(),
        decided_by: adminId,
        decision_reason: input.reason,
        // A first approval does not carry over to a later application.
        ...(input.decision === "approve" ? {} : { first_approved_by: null }),
        // An approved member is looked at again in a year.
        recheck_due_at: input.decision === "approve" ? new Date(Date.now() + YEAR) : null,
        recheck_reason: null,
      },
    });
    await tx.user.update({ where: { id: application.user_id }, data: { approval_status: status } });
    await tx.vettingCheck.createMany({
      data: input.checks.map((c) => ({ ...c, application_id: applicationId, checked_by: adminId })),
    });
    await tx.adminAction.create({
      data: { admin_id: adminId, action: input.decision, target_user_id: application.user_id, reason: input.reason },
    });

    // Approval is what hands an investor the record she asked to take
    // over, if nobody took it in the meantime.
    if (input.decision === "approve" && application.claims_funder_id && !application.user.funder) {
      await tx.funder.updateMany({
        where: { id: application.claims_funder_id, claimed_by_user_id: null },
        data: { claimed_by_user_id: application.user_id },
      });
    }
  });

  setApproved(application.user_id, status === "approved");

  // A final decision starts the 30 days after which the files are deleted.
  if (input.decision !== "needs_info") await scheduleDeletion(applicationId);

  const OUTCOME = {
    approve: ["You are approved", "You can now see and connect with other members."],
    reject: ["Your application was not approved", input.reason],
    needs_info: ["We need a little more from you", input.reason],
  } as const;
  const [title, body] = OUTCOME[input.decision];
  await notify(application.user_id, { type: `vetting_${input.decision}`, title, body, link: "/vetting/application" });

  // Also by email: someone who is waiting may not have the app open.
  const applicantUser = await prisma.user.findUnique({ where: { id: application.user_id }, select: { email: true } });
  if (applicantUser) await sendEmail(applicantUser.email, `FoundersLink: ${title}`, body);

  return { application_id: applicationId, approval_status: status };
}

// Suspend an approved member, or bring a suspended one back.
export async function setSuspended(adminId: string, userId: string, suspend: boolean, reason: string) {
  // Suspending yourself would lock you out with nobody having decided it.
  if (userId === adminId) throw conflict("OWN_ACCOUNT", "You cannot suspend or reinstate your own account");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { approval_status: true } });
  if (!user) throw notFound("No such user");

  const [from, to] = suspend ? (["approved", "suspended"] as const) : (["suspended", "approved"] as const);
  if (user.approval_status !== from) {
    throw conflict("WRONG_STATUS", `Only ${from === "approved" ? "an approved" : "a suspended"} member can be ${suspend ? "suspended" : "reinstated"}`);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { approval_status: to } }),
    prisma.adminAction.create({
      data: { admin_id: adminId, action: suspend ? "suspend" : "reinstate", target_user_id: userId, reason },
    }),
  ]);

  // A suspended member stops receiving live chat at once, and a
  // reinstated one starts again.
  setApproved(userId, !suspend);

  return { user_id: userId, approval_status: to };
}

export function listAdminActions() {
  return prisma.adminAction.findMany({
    orderBy: { created_at: "desc" },
    take: 50,
    include: {
      admin: { select: { id: true, full_name: true } },
      target: { select: { id: true, full_name: true, role: true } },
    },
  });
}

// --- Re-checks ---

export const recheckSchema = z.object({
  outcome: z.enum(["confirm", "suspend"]),
  reason: z.string().trim().min(5, "Give a reason"),
});

// Called when an approved member changes something her approval rested
// on, such as the organisation she invests for. She stays approved, and
// goes on the admins' list to be looked at again.
export async function flagForRecheck(userId: string, reason: string) {
  await prisma.vettingApplication.updateMany({
    where: { user_id: userId, user: { approval_status: "approved" } },
    data: { recheck_due_at: new Date(), recheck_reason: reason },
  });
}

// Approved members who are due to be looked at again: a year has
// passed, or a key detail changed.
export async function listRechecks(now = new Date()) {
  const due = await prisma.vettingApplication.findMany({
    where: { recheck_due_at: { lte: now }, user: { approval_status: "approved" } },
    include: { user: applicant },
    orderBy: { recheck_due_at: "asc" },
  });
  return due.map((a) => ({
    application_id: a.id,
    user: a.user,
    due_at: a.recheck_due_at,
    reason: a.recheck_reason ?? "Yearly re-check",
    approved_at: a.decided_at,
  }));
}

export async function recheck(adminId: string, applicationId: string, input: z.infer<typeof recheckSchema>) {
  const application = await prisma.vettingApplication.findUnique({
    where: { id: applicationId },
    include: { user: { select: { approval_status: true } } },
  });
  if (!application || application.user.approval_status !== "approved" || !application.recheck_due_at) {
    throw notFound("No re-check is due for this application");
  }

  if (input.outcome === "suspend") {
    await setSuspended(adminId, application.user_id, true, input.reason);
    return { application_id: applicationId, approval_status: "suspended" };
  }

  await prisma.$transaction([
    prisma.vettingApplication.update({
      where: { id: applicationId },
      data: { recheck_due_at: new Date(Date.now() + YEAR), recheck_reason: null },
    }),
    prisma.adminAction.create({
      data: { admin_id: adminId, action: "recheck_confirmed", target_user_id: application.user_id, reason: input.reason },
    }),
  ]);
  return { application_id: applicationId, approval_status: "approved" };
}
