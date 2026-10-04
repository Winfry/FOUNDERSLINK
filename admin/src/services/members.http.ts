import type { ApprovalStatus, ConsentRecord, MemberDetail, MemberListItem, MemberReportSummary, MemberRole, PaginatedParams, PaginatedResult } from "@/types";
import { ApiError, backend } from "@/lib/api";

interface ApiUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: MemberRole;
  // The backend also has "banned", which the dashboard shows as it is.
  approval_status: ApprovalStatus;
  created_at: string;
  summary: string | null;
  sector: string | null;
  county: string | null;
}

interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

interface ApiUserDetail {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: MemberRole;
  approval_status: ApprovalStatus;
  created_at: string;
  founder_profile: { business_name: string | null; county: string | null } | null;
  investor_profile: { organisation_name: string | null } | null;
  expert_profile: { profession: string | null } | null;
  vetting_application: {
    phone: string | null;
    organisation_name: string | null;
    risk_level: string | null;
    submitted_at: string | null;
    decided_at: string | null;
    decision_reason: string | null;
    checks: unknown[];
  } | null;
  consents: { purpose: ConsentRecord["purpose"]; granted: boolean }[];
  timeline: { at: string; event: string; text: string; by: string | null; reason: string | null }[];
}

interface ApiReports {
  messages: { id: string; reason: string; sender: { id: string }; created_at: string }[];
  members: { id: string; reason: string; reported: { id: string }; created_at: string }[];
}

// A suspended or banned member is shown as suspended. Everyone else is active.
const memberStatus = (status: string) => (status === "suspended" || status === "banned" ? ("suspended" as const) : ("active" as const));

function toItem(u: ApiUser): MemberListItem {
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    organisationOrBusiness: u.summary,
    memberStatus: memberStatus(u.approval_status),
    joinedAt: u.created_at,
    approvalStatus: u.approval_status,
  };
}

const MAX_PAGE = 100;

// Every member of one role, a hundred at a time (the backend's largest page).
async function allOfRole(role: MemberRole, search: string): Promise<MemberListItem[]> {
  const all: MemberListItem[] = [];
  for (let page = 1; ; page++) {
    const res = await backend<ApiPage<ApiUser>>("GET", `/admin/users?role=${role}&page=${page}&page_size=${MAX_PAGE}${search}`);
    all.push(...res.items.map(toItem));
    if (page >= res.pages) return all;
  }
}

export async function fetchMembers(role: MemberRole, params: PaginatedParams = {}): Promise<PaginatedResult<MemberListItem>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE, params.pageSize ?? 10);
  const term = (params.search ?? "").trim();
  const search = term ? `&search=${encodeURIComponent(term)}` : "";
  const status = params.status && params.status !== "all" ? params.status : "";

  // "Active" is not a backend status: it is everyone who is not
  // suspended, so it is worked out here.
  if (status === "active") {
    const active = (await allOfRole(role, search)).filter((m) => m.memberStatus === "active");
    return { data: active.slice((page - 1) * pageSize, page * pageSize), total: active.length, page, pageSize };
  }

  const res = await backend<ApiPage<ApiUser>>(
    "GET",
    `/admin/users?role=${role}&page=${page}&page_size=${pageSize}${search}${status ? `&status=${status}` : ""}`,
  );
  return { data: res.items.map(toItem), total: res.total, page, pageSize };
}

const CONSENT_LABELS: Record<ConsentRecord["purpose"], string> = {
  profile_visibility: "Profile visibility",
  ai_matching: "AI matching",
  eligibility_attributes: "Eligibility attributes",
  contact: "SMS or WhatsApp contact",
  document_processing: "Document processing",
};

// The member page gives only a count of reports. The reports themselves
// come from the reports list (the newest hundred of each kind).
async function reportsAgainst(userId: string): Promise<MemberReportSummary[]> {
  const reports = await backend<ApiReports>("GET", "/admin/reports");
  return [
    ...reports.messages.filter((r) => r.sender.id === userId),
    ...reports.members.filter((r) => r.reported.id === userId),
  ]
    // The backend does not record whether a report has been handled.
    .map((r) => ({ id: r.id, reason: r.reason, reportedAt: r.created_at, status: "open" as const }))
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

function verificationSummary(u: ApiUserDetail): string | null {
  const a = u.vetting_application;
  if (!a || !a.submitted_at) return null;
  return [
    `Application ${u.approval_status.replace(/_/g, " ")}`,
    a.risk_level ? `risk level ${a.risk_level}` : null,
    `${a.checks.length} check${a.checks.length === 1 ? "" : "s"} recorded`,
    a.decision_reason ? `last decision: ${a.decision_reason}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function toDetail(u: ApiUserDetail, reports: MemberReportSummary[]): MemberDetail {
  const granted = new Map(u.consents.map((c) => [c.purpose, c.granted]));
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? u.vetting_application?.phone ?? null,
    county: u.founder_profile?.county ?? null,
    organisationOrBusiness:
      u.founder_profile?.business_name ?? u.investor_profile?.organisation_name ?? u.vetting_application?.organisation_name ?? u.expert_profile?.profession ?? null,
    memberStatus: memberStatus(u.approval_status),
    joinedAt: u.created_at,
    approvalStatus: u.approval_status,
    verificationSummary: verificationSummary(u),
    // A purpose she has never answered counts as not granted. The
    // backend does not send when each was last changed.
    consents: (Object.keys(CONSENT_LABELS) as ConsentRecord["purpose"][]).map((purpose) => ({
      purpose,
      label: CONSENT_LABELS[purpose],
      granted: granted.get(purpose) ?? false,
      updatedAt: null,
    })),
    reportsAgainst: reports,
    // Newest first, as the page shows it.
    timeline: u.timeline
      .map((e, i) => ({
        id: String(i),
        title: e.text.charAt(0).toUpperCase() + e.text.slice(1),
        description: [e.reason, e.by ? `by ${e.by}` : null].filter(Boolean).join(" — ") || undefined,
        at: e.at,
      }))
      .reverse(),
  };
}

export async function fetchMemberDetail(id: string): Promise<MemberDetail | null> {
  try {
    const [user, reports] = await Promise.all([backend<ApiUserDetail>("GET", `/admin/users/${id}`), reportsAgainst(id)]);
    return toDetail(user, reports);
  } catch (err) {
    // An unknown id, or one that is not a uuid, is "no such member".
    if (err instanceof ApiError && [400, 404, 422].includes(err.status)) return null;
    throw err;
  }
}

// The backend suspends only an approved member and reinstates only a
// suspended one. When it refuses, nothing changed and null is returned.
async function setSuspended(id: string, verb: "suspend" | "reinstate", reason: string) {
  try {
    await backend("POST", `/admin/users/${id}/${verb}`, { reason });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return null;
    throw err;
  }
  return fetchMemberDetail(id);
}

export const suspendMember = (id: string, reason: string) => setSuspended(id, "suspend", reason);
export const reinstateMember = (id: string, reason: string) => setSuspended(id, "reinstate", reason);

export async function exportMembersCsv(role: MemberRole): Promise<string> {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = await allOfRole(role, "");
  return (
    "Name,Organisation,Status,Joined,Verification status\n" +
    rows.map((r) => [r.fullName, r.organisationOrBusiness ?? "", r.memberStatus, r.joinedAt, r.approvalStatus].map(cell).join(",")).join("\n")
  );
}
