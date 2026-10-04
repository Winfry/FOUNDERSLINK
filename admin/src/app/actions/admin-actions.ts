"use server";

import { revalidatePath } from "next/cache";
import { addRecheckAudit } from "@/services/admin-mock-store";
import { confirmDocument, rejectDocument } from "@/services/deal-reviews.service";
import { reviewComplianceSource } from "@/services/compliance-sources.service";
import { exportMembersCsv, reinstateMemberAction, suspendMemberAction } from "@/services/members.service";
import type { CheckInput, MemberRole, VerificationDetail } from "@/types";
import { ApiError } from "@/lib/api";
import { actOnMemberReport, actOnMessageReport } from "@/services/reports.service";
import { decideVerification } from "@/services/verification.service";
import { recordRecheck } from "@/services/rechecks.service";
import { changePassword, enableTwoFactor } from "@/services/settings.service";

// What the page says when a decision was not saved. When the server
// refused, its own message is passed on. "Did not answer" is said only
// when it really did not.
function refusal(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The server did not answer. Nothing was changed: try again.";
}

// Errors are returned, not thrown: a thrown error reaches the page
// without its message.
export async function verificationDecisionAction(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: CheckInput[],
): Promise<{ ok: true; detail: VerificationDetail | null } | { ok: false; message: string }> {
  try {
    const detail = await decideVerification(id, decision, reason, checks);
    revalidatePath("/verification");
    revalidatePath(`/verification/${id}`);
    revalidatePath("/overview");
    revalidatePath("/audit-log");
    revalidatePath("/members");
    return { ok: true, detail };
  } catch (err) {
    return { ok: false, message: refusal(err) };
  }
}

export async function suspendMemberFormAction(id: string, reason: string) {
  const result = await suspendMemberAction(id, reason);
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  revalidatePath("/audit-log");
  return result;
}

export async function reinstateMemberFormAction(id: string, reason: string) {
  const result = await reinstateMemberAction(id, reason);
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  revalidatePath("/audit-log");
  return result;
}

// Runs on the server, where the admin's session is.
export async function exportMembersCsvAction(role: MemberRole) {
  return exportMembersCsv(role);
}

export async function confirmDocumentAction(dealId: string, documentId: string) {
  const result = await confirmDocument(dealId, documentId);
  revalidatePath(`/deal-reviews/${dealId}`);
  revalidatePath("/deal-reviews");
  revalidatePath("/audit-log");
  return result;
}

export async function rejectDocumentAction(dealId: string, documentId: string, reason: string) {
  const result = await rejectDocument(dealId, documentId, reason);
  revalidatePath(`/deal-reviews/${dealId}`);
  revalidatePath("/audit-log");
  return result;
}

export async function reportMessageAction(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  const result = await actOnMessageReport(id, action, reason);
  revalidatePath("/reports");
  revalidatePath("/audit-log");
  return result;
}

export async function reportMemberAction(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  const result = await actOnMemberReport(id, action, reason);
  revalidatePath("/reports");
  revalidatePath("/audit-log");
  return result;
}

export async function complianceReviewAction(id: string, note: string) {
  const result = await reviewComplianceSource(id, note);
  revalidatePath("/compliance-sources");
  revalidatePath("/audit-log");
  return result;
}

export async function recheckRecordedAction(memberName: string, reason: string) {
  addRecheckAudit(memberName, reason);
  revalidatePath("/audit-log");
  revalidatePath("/rechecks");
}

export async function recheckDecisionAction(
  id: string,
  memberName: string,
  outcome: "confirm" | "suspend",
  reason: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await recordRecheck(id, memberName, outcome, reason);
    revalidatePath("/audit-log");
    revalidatePath("/rechecks");
    revalidatePath("/members");
    revalidatePath("/overview");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: refusal(err) };
  }
}

export async function enableTwoFactorAction(code: string) {
  const result = await enableTwoFactor(code);
  revalidatePath("/settings");
  return result;
}

export async function changePasswordAction(current: string, next: string, confirm: string) {
  return changePassword(current, next, confirm);
}
