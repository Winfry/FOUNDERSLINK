import type { ApprovalStatus, CheckInput, CheckMethod, MemberRole, PaginatedParams, PaginatedResult, RiskLevel, VerificationDetail, VerificationQueueItem, VettingDecisionRecord } from "@/types";
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
  user: ApiApplicant & {
    expert_profile?: { profession?: string | null; registration_number?: string | null } | null;
    founder_profile?: {
      business_name: string | null;
      description: string | null;
      sector: string | null;
      stage: string | null;
      county: string | null;
      funding_amount_kes: number | null;
      use_of_funds: string | null;
      website: string | null;
    } | null;
    investor_profile?: { organisation_name: string | null; job_title: string | null; organisation_website: string | null; bio: string | null } | null;
    funder?: {
      name: string | null;
      mandate_text: string | null;
      sectors: string[] | null;
      stages: string[] | null;
      ticket_min_kes: number | null;
      ticket_max_kes: number | null;
    } | null;
  };
  claims_funder?: { name: string | null } | null;
}

// The member's own record: says whether her email and phone were
// confirmed by code, and carries every admin action about her.
interface ApiMember {
  email_verified_at: string | null;
  phone_verified_at: string | null;
  timeline: { at: string; event: string; by: string | null; reason: string | null }[];
}

interface ApiAction {
  id: string;
  action: string;
  reason: string;
  created_at: string;
  admin: { full_name: string } | null;
  target: { id: string } | null;
}

// The audit log's actions that are decisions about a member's standing.
const DECISION_ACTIONS = ["approve", "approve_first", "reject", "needs_info", "suspend", "reinstate", "recheck_confirmed"];

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

// Every decision about this member, newest first. Her own record holds
// all of them. If it cannot be read, the audit log (the newest fifty
// actions across all members) is used instead.
async function decisionHistory(userId: string): Promise<{ member: ApiMember | null; decisions: VettingDecisionRecord[] }> {
  const [member, actions] = await Promise.all([
    backend<ApiMember>("GET", `/admin/users/${userId}`).catch(() => null),
    backend<ApiAction[]>("GET", "/admin/actions").catch(() => [] as ApiAction[]),
  ]);
  const fromLog = actions
    .filter((a) => a.target?.id === userId)
    .map((a) => ({ id: a.id, decision: a.action, reason: a.reason, decidedAt: a.created_at, decidedBy: a.admin?.full_name ?? null }));
  const fromMember = (member?.timeline ?? []).map((e, i) => ({
    id: `t${i}`,
    decision: e.event,
    reason: e.reason ?? "",
    decidedAt: typeof e.at === "string" ? e.at : new Date(e.at).toISOString(),
    decidedBy: e.by,
  }));
  const decisions = (fromMember.length >= fromLog.length ? fromMember : fromLog)
    .filter((d) => DECISION_ACTIONS.includes(d.decision))
    .sort((x, y) => y.decidedAt.localeCompare(x.decidedAt)) as VettingDecisionRecord[];
  return { member, decisions };
}

function toDetail(a: ApiDetail, member: ApiMember | null, decisions: VettingDecisionRecord[]): VerificationDetail {
  const checks = a.checks.map((c) => ({
    id: c.id,
    checkType: c.check_type,
    result: RESULT[c.result],
    method: c.method as CheckMethod,
    recordedAt: c.checked_at,
  }));
  const f = a.user.founder_profile;
  const inv = a.user.investor_profile;
  const funder = a.user.funder;
  const latest = decisions[0];
  const waiting = a.user.approval_status === "submitted" || a.user.approval_status === "in_review";
  return {
    ...toItem(a),
    phone: a.phone,
    statement: a.statement,
    organisationName: a.organisation_name ?? inv?.organisation_name ?? null,
    website: a.organisation_website ?? inv?.organisation_website ?? f?.website ?? null,
    // The backend keeps references as one free-text field.
    references: a.references ? [{ name: a.references, relationship: "", phone: "" }] : [],
    professionalRegister: a.user.expert_profile?.profession ?? null,
    registerNumber: a.user.expert_profile?.registration_number ?? null,
    // The backend sends each signal as one sentence.
    riskSignals: a.risk_signals.map((text, i) => ({ id: String(i), text, explanation: "" })),
    decisions,
    checks,
    business: f
      ? {
          name: f.business_name,
          sector: f.sector,
          stage: f.stage,
          county: f.county,
          amountKes: f.funding_amount_kes,
          useOfFunds: f.use_of_funds,
          description: f.description,
          website: f.website,
        }
      : null,
    investor:
      a.user.role === "investor"
        ? {
            organisation: inv?.organisation_name ?? a.organisation_name,
            jobTitle: inv?.job_title ?? null,
            website: inv?.organisation_website ?? a.organisation_website,
            bio: inv?.bio ?? null,
            funds: funder
              ? {
                  name: funder.name,
                  sectors: funder.sectors ?? [],
                  stages: funder.stages ?? [],
                  ticketMinKes: funder.ticket_min_kes,
                  ticketMaxKes: funder.ticket_max_kes,
                  mandate: funder.mandate_text,
                }
              : null,
            claimsFunderName: a.claims_funder?.name ?? null,
          }
        : null,
    // Undefined when her record could not be read: the page then says nothing.
    emailConfirmedAt: member ? member.email_verified_at : undefined,
    phoneConfirmedAt: member ? member.phone_verified_at : undefined,
    resubmittedAfter:
      waiting && latest?.decision === "needs_info" ? { reason: latest.reason, at: latest.decidedAt, by: latest.decidedBy ?? null } : null,
    firstApprovalBy: waiting && latest?.decision === "approve_first" ? (latest.decidedBy ?? "another admin") : null,
  };
}

// Opening an application marks it "in review" on the backend.
export async function fetchVerificationDetail(id: string): Promise<VerificationDetail | null> {
  try {
    const application = await backend<ApiDetail>("GET", `/admin/vetting/${id}`);
    const { member, decisions } = await decisionHistory(application.user.id);
    return toDetail(application, member, decisions);
  } catch {
    return null;
  }
}

const DECISION = { approved: "approve", rejected: "reject", needs_info: "needs_info" } as const;

// The form offers the backend's own check types and methods, so what
// was chosen is sent as it is. Nothing is guessed.
export async function decideVerification(id: string, decision: "approved" | "rejected" | "needs_info", reason: string, checks: CheckInput[]) {
  await backend("POST", `/admin/vetting/${id}/decision`, {
    decision: DECISION[decision],
    reason,
    checks: checks.map((c) => ({ check_type: c.checkType, result: c.result === "passed" ? "pass" : "fail", method: c.method })),
  });
  return fetchVerificationDetail(id);
}
