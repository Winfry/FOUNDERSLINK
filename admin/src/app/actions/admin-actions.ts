"use server";

import { revalidatePath } from "next/cache";
import { addRecheckAudit } from "@/services/admin-mock-store";
import { confirmDocument, rejectDocument } from "@/services/deal-reviews.service";
import { reviewComplianceSource } from "@/services/compliance-sources.service";
import { reinstateMemberAction, suspendMemberAction } from "@/services/members.service";
import { actOnMemberReport, actOnMessageReport } from "@/services/reports.service";
import { decideVerification } from "@/services/verification.service";
import { changePassword, enableTwoFactor } from "@/services/settings.service";

export async function verificationDecisionAction(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: { checkType: string; result: "passed" | "failed"; method: "manual" | "provider" }[],
) {
  const result = await decideVerification(id, decision, reason, checks);
  revalidatePath("/verification");
  revalidatePath(`/verification/${id}`);
  revalidatePath("/overview");
  revalidatePath("/audit-log");
  revalidatePath("/members");
  return result;
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

export async function enableTwoFactorAction(code: string) {
  const result = await enableTwoFactor(code);
  revalidatePath("/settings");
  return result;
}

export async function changePasswordAction(current: string, next: string, confirm: string) {
  return changePassword(current, next, confirm);
}
