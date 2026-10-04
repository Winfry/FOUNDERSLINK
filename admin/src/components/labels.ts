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
