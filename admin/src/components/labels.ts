// Words for the values the backend sends, so nobody reads snake_case.

const APPROVAL: Record<string, string> = {
  draft: "Not submitted",
  submitted: "Waiting for review",
  in_review: "In review",
  needs_info: "Needs more info",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  reinstated: "Reinstated",
};

const STAGE: Record<string, string> = {
  exploring: "Exploring",
  due_diligence: "Due diligence",
  terms_agreed: "Terms agreed",
  documents_compliance: "Documents and compliance",
  closed: "Closed",
  active: "Active",
};

const DEAL_TYPE: Record<string, string> = {
  cofounder_partnership: "Co-founder partnership",
  investment: "Investment",
  expert_engagement: "Expert engagement",
  joint_venture: "Joint venture",
};

const ROLE: Record<string, string> = {
  founder: "Founder",
  investor: "Investor",
  expert: "Expert",
  admin: "Admin",
  organiser: "Organiser",
  treasurer: "Treasurer",
  member: "Member",
};

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const approvalLabel = (s: string) => APPROVAL[s] ?? humanize(s);
export const stageLabel = (s: string) => STAGE[s] ?? humanize(s);
export const dealTypeLabel = (s: string) => DEAL_TYPE[s] ?? humanize(s);
export const roleLabel = (s: string) => ROLE[s] ?? humanize(s);

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDayTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// The checks staff can record, in the backend's own values.
export const CHECK_TYPE_LABEL: Record<string, string> = {
  identity: "Identity",
  phone: "Phone",
  organisation: "Organisation",
  track_record: "Track record",
  professional_register: "Professional register",
  reference: "Reference",
};

export const CHECK_METHOD_LABEL: Record<string, string> = {
  manual: "By hand",
  otp: "Phone code",
  provider: "Outside provider",
  brs: "BRS lookup",
  lsk: "LSK register",
  icpak: "ICPAK register",
  cma: "CMA register",
  domain: "Website or email domain",
  reference: "Reference call",
};

export const checkTypeLabel = (s: string) => CHECK_TYPE_LABEL[s.replace(/ /g, "_")] ?? humanize(s);
export const checkMethodLabel = (s: string) => CHECK_METHOD_LABEL[s] ?? humanize(s);

// What an admin did, as the audit log records it, in words.
const AUDIT_ACTION: Record<string, string> = {
  approve: "Approved",
  approved: "Approved",
  approve_first: "Approved (first of two)",
  reject: "Rejected",
  rejected: "Rejected",
  needs_info: "Asked for more information",
  suspend: "Suspended",
  suspended: "Suspended",
  reinstate: "Reinstated",
  reinstated: "Reinstated",
  recheck_confirmed: "Confirmed after a re-check",
  confirm_document: "Confirmed a document",
  reject_document: "Rejected a document",
  create_admin: "Created an admin",
};

export const auditActionLabel = (s: string) => AUDIT_ACTION[s.trim().replace(/[ .]+/g, "_")] ?? humanize(s.replace(/\./g, " "));

export function formatKes(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `KSh ${amount.toLocaleString("en-KE")}`;
}
