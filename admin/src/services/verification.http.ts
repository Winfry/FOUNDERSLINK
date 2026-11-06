import type {
  ApprovalStatus,
  MemberRole,
  PaginatedParams,
  PaginatedResult,
  RiskLevel,
  VerificationDetail,
  VerificationQueueItem,
  VettingCheck,
  VettingDecisionRecord,
} from "@/types";
import { isCheckMethod, isCheckType, type NewCheck } from "@/lib/checks";
import { backend } from "@/lib/api";

interface ApiApplicant {
  id: string;
  full_name: string;
  email: string;
  role: MemberRole;
  approval_status: ApprovalStatus;
}

interface ApiListItem {
  id: string;
  user: ApiApplicant;
  risk_level: RiskLevel | null;
  risk_signals: string[];
  submitted_at: string | null;
}

interface ApiCheck {
  id: string;
  check_type: string;
  result: "pass" | "fail";
  method: string;
  checked_at: string;
}

interface ApiDetail extends ApiListItem {
  phone: string | null;
  statement: string | null;
  organisation_name: string | null;
  organisation_website: string | null;
  references: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  checks: ApiCheck[];
  recheck_due_at: string | null;
  recheck_reason: string | null;
  history: { id: string; action: string; reason: string; created_at: string; admin: { full_name: string }; checks: ApiCheck[] }[];
  user: ApiApplicant & { expert_profile?: { profession?: string | null; registration_number?: string | null } | null };
}

// The dashboard's tabs, and the backend statuses each one covers.
const TAB_STATUS: Record<string, ApprovalStatus[]> = {
  waiting: ["submitted", "in_review"],
  needs_info: ["needs_info"],
  approved: ["approved"],
  rejected: ["rejected"],
  suspended: ["suspended"],
};

const RISK_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function toItem(a: ApiListItem): VerificationQueueItem {
  return {
    id: a.id,
    memberId: a.user.id,
    fullName: a.user.full_name,
    email: a.user.email,
    role: a.user.role,
    riskLevel: a.risk_level ?? "low",
    topRiskSignal: a.risk_signals[0] ?? null,
    submittedAt: a.submitted_at ?? "",
    approvalStatus: a.user.approval_status,
  };
}

export async function fetchVerificationQueue(tab: string, params: PaginatedParams = {}): Promise<PaginatedResult<VerificationQueueItem>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 10;
  const role = params.status && params.status !== "all" ? `&role=${params.status}` : "";

  // A tab can cover two statuses, so each is asked for and the results
  // are put together here. The queues are short.
  const lists = await Promise.all(
    (TAB_STATUS[tab] ?? TAB_STATUS.waiting).map((status) =>
      backend<{ items: ApiListItem[] }>("GET", `/admin/vetting/applications?status=${status}&page_size=100${role}`),
    ),
  );
  const search = (params.search ?? "").trim().toLowerCase();
  const all = lists
    .flatMap((list) => list.items.map(toItem))
    .filter((item) => !search || `${item.fullName} ${item.email}`.toLowerCase().includes(search))
    // Highest risk first, then the longest wait: the order to review in.
    .sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel] || a.submittedAt.localeCompare(b.submittedAt));

  return { data: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize };
}

const RESULT = { pass: "passed", fail: "failed" } as const;

const toCheck = (c: ApiCheck): VettingCheck => ({
  id: c.id,
  // An unknown value would mean the backend's list grew; show it as identity
  // or by hand rather than break the page.
  checkType: isCheckType(c.check_type) ? c.check_type : "identity",
  result: RESULT[c.result],
  method: isCheckMethod(c.method) ? c.method : "manual",
  recordedAt: c.checked_at,
});

// The backend's audit actions, as the decisions shown in the history.
const DECISION_OF: Record<string, VettingDecisionRecord["decision"]> = {
  approve: "approved",
  approve_first: "approved_first",
  reject: "rejected",
  needs_info: "needs_info",
  suspend: "suspended",
  suspend_confirmed: "suspended",
  reinstate: "reinstated",
  recheck_confirmed: "recheck_confirmed",
};

function toDetail(a: ApiDetail): VerificationDetail {
  const checks = a.checks.map(toCheck);
  return {
    ...toItem(a),
    phone: a.phone,
    statement: a.statement,
    organisationName: a.organisation_name,
    website: a.organisation_website,
    // The backend keeps references as one free-text field.
    references: a.references ? [{ name: a.references, relationship: "", phone: "" }] : [],
    professionalRegister: a.user.expert_profile?.profession ?? null,
    registerNumber: a.user.expert_profile?.registration_number ?? null,
    // The backend sends each signal as one sentence.
    riskSignals: a.risk_signals.map((text, i) => ({ id: String(i), text, explanation: "" })),
    // From the audit log, so a resubmission does not wipe it (FINAL_VERIFICATION 18).
    decisions: a.history
      .filter((h) => DECISION_OF[h.action])
      .map((h) => ({
        id: h.id,
        decision: DECISION_OF[h.action]!,
        reason: h.reason,
        decidedAt: h.created_at,
        by: h.admin.full_name,
        checks: h.checks.map(toCheck),
      })),
    checks,
    recheck:
      a.user.approval_status === "approved" && a.recheck_due_at && new Date(a.recheck_due_at).getTime() <= Date.now()
        ? { dueAt: a.recheck_due_at, reason: a.recheck_reason ?? "Yearly re-check" }
        : null,
  };
}

// Opening an application marks it "in review" on the backend.
export async function fetchVerificationDetail(id: string): Promise<VerificationDetail | null> {
  try {
    return toDetail(await backend<ApiDetail>("GET", `/admin/vetting/${id}`));
  } catch {
    return null;
  }
}

const DECISION = { approved: "approve", rejected: "reject", needs_info: "needs_info" } as const;
export async function decideVerification(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: NewCheck[],
) {
  await backend("POST", `/admin/vetting/${id}/decision`, {
    decision: DECISION[decision],
    reason,
    checks: checks.map((c) => ({ check_type: c.checkType, result: c.result === "passed" ? "pass" : "fail", method: c.method })),
  });
  return fetchVerificationDetail(id);
}
