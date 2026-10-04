import type { ApprovalStatus, MemberRole, PaginatedParams, PaginatedResult, RiskLevel, VerificationDetail, VerificationQueueItem } from "@/types";
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

interface ApiDetail extends ApiListItem {
  phone: string | null;
  statement: string | null;
  organisation_name: string | null;
  organisation_website: string | null;
  references: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  checks: { id: string; check_type: string; result: "pass" | "fail"; method: string; checked_at: string }[];
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

function toDetail(a: ApiDetail): VerificationDetail {
  const checks = a.checks.map((c) => ({
    id: c.id,
    checkType: c.check_type.replace(/_/g, " "),
    result: RESULT[c.result],
    method: c.method === "provider" ? ("provider" as const) : ("manual" as const),
    recordedAt: c.checked_at,
  }));
  const decided = ["approved", "rejected", "needs_info"].includes(a.user.approval_status) && a.decided_at;
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
    decisions: decided
      ? [{ id: a.id, decision: a.user.approval_status as "approved" | "rejected" | "needs_info", reason: a.decision_reason ?? "", decidedAt: a.decided_at!, checks }]
      : [],
    checks,
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
const CHECK_TYPES = ["identity", "phone", "organisation", "track_record", "professional_register", "reference"];

// The form takes a check as free text ("Phone number"). The backend
// keeps a fixed list, so each is matched to the closest one.
function checkTypeOf(text: string) {
  const t = text.toLowerCase();
  if (t.includes("phone")) return "phone";
  if (t.includes("organ") || t.includes("website") || t.includes("domain")) return "organisation";
  if (t.includes("track") || t.includes("portfolio")) return "track_record";
  if (t.includes("regist") || t.includes("lsk") || t.includes("icpak")) return "professional_register";
  if (t.includes("refer")) return "reference";
  return CHECK_TYPES.includes(t) ? t : "identity";
}

export async function decideVerification(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: { checkType: string; result: "passed" | "failed"; method: "manual" | "provider" }[],
) {
  await backend("POST", `/admin/vetting/${id}/decision`, {
    decision: DECISION[decision],
    reason,
    checks: checks.map((c) => ({ check_type: checkTypeOf(c.checkType), result: c.result === "passed" ? "pass" : "fail", method: c.method })),
  });
  return fetchVerificationDetail(id);
}
