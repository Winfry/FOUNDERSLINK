"use server";

import { revalidatePath } from "next/cache";
import type { NewCheck } from "@/lib/checks";
import { confirmDocument, rejectDocument } from "@/services/deal-reviews.service";
import { reviewComplianceSource } from "@/services/compliance-sources.service";
import { exportMembersCsv, reinstateMemberAction, suspendMemberAction } from "@/services/members.service";
import type { MemberRole, VerificationDetail } from "@/types";
import { ApiError } from "@/lib/api";
import { actOnMemberReport, actOnMessageReport } from "@/services/reports.service";
import { decideVerification } from "@/services/verification.service";
import { decideRecheck } from "@/services/rechecks.service";
import { changePassword, enableTwoFactor } from "@/services/settings.service";

// What a decision on the verification page comes back with. A thrown
// error loses its message on the way out of a server action, so the
// backend's own reason is returned instead (FINAL_VERIFICATION 18: a
// refusal used to read "the server did not answer").
export type DecisionResult = { ok: true; detail: VerificationDetail } | { ok: false; message: string };

async function decided(run: () => Promise<VerificationDetail | null>): Promise<DecisionResult> {
  try {
    const detail = await run();
    return detail
      ? { ok: true, detail }
      : { ok: false, message: "The decision may have been saved, but the page could not load it again. Refresh the page to check." };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, message: `Not saved: ${e.message}.` };
    return { ok: false, message: "Not saved: the FoundersLink server did not answer. Try again." };
  }
}

function refreshVerificationPages(id: string) {
  revalidatePath("/verification");
  revalidatePath(`/verification/${id}`);
  revalidatePath("/rechecks");
  revalidatePath("/overview");
  revalidatePath("/audit-log");
  revalidatePath("/members");
}

export async function verificationDecisionAction(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: NewCheck[],
): Promise<DecisionResult> {
  const result = await decided(() => decideVerification(id, decision, reason, checks));
  refreshVerificationPages(id);
  return result;
}

// A re-check of an approved member: keep her approved for another year, or suspend her.
export async function recheckDecisionAction(id: string, outcome: "confirm" | "suspend", reason: string): Promise<DecisionResult> {
  const result = await decided(() => decideRecheck(id, outcome, reason));
  refreshVerificationPages(id);
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
  action: "dismiss" | "suspend",
  reason: string,
) {
  const result = await actOnMessageReport(id, action, reason);
  revalidatePath("/reports");
  revalidatePath("/audit-log");
  revalidatePath("/overview");
  revalidatePath("/members");
  return result;
}

export async function reportMemberAction(
  id: string,
  action: "dismiss" | "suspend",
  reason: string,
) {
  const result = await actOnMemberReport(id, action, reason);
  revalidatePath("/reports");
  revalidatePath("/audit-log");
  revalidatePath("/overview");
  revalidatePath("/members");
  return result;
}

export async function complianceReviewAction(id: string, note: string) {
  const result = await reviewComplianceSource(id, note);
  revalidatePath("/compliance-sources");
  revalidatePath("/audit-log");
  return result;
}

export async function enableTwoFactorAction(code: string) {
  const result = await enableTwoFactor(code);
  revalidatePath("/settings");
  return result;
}

export async function changePasswordAction(current: string, next: string, confirm: string) {
  return changePassword(current, next, confirm);
}
