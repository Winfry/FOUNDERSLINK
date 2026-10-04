import type { AuditEntry, PaginatedParams, PaginatedResult } from "@/types";
import { backend } from "@/lib/api";

interface ApiAction {
  id: string;
  action: string;
  reason: string;
  created_at: string;
  admin: { id: string; full_name: string } | null;
  target: { id: string; full_name: string; role: string } | null;
}

// The filter on the page, and the backend actions each choice covers.
// The backend records no report or compliance actions, so the page
// offers no such choices.
const ACTION_TYPES: Record<string, string[]> = {
  verification: ["approve", "approve_first", "reject", "needs_info", "recheck_confirmed"],
  member: ["suspend", "reinstate", "create_admin"],
  document: ["confirm_document", "reject_document"],
};

// The words the page shows, so a search for "approved" finds them.
const WORDS: Record<string, string> = {
  approve: "Approved",
  approve_first: "Approved (first of two)",
  reject: "Rejected",
  needs_info: "Asked for more information",
  suspend: "Suspended",
  reinstate: "Reinstated",
  recheck_confirmed: "Confirmed after a re-check",
  confirm_document: "Confirmed a document",
  reject_document: "Rejected a document",
  create_admin: "Added an admin",
};

// The backend sends the newest fifty actions and has no paging or
// filters, so searching and paging happen here.
export async function fetchAuditLog(params: PaginatedParams = {}): Promise<PaginatedResult<AuditEntry>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 10;
  const search = (params.search ?? "").trim().toLowerCase();
  const type = params.actionType && params.actionType !== "all" ? params.actionType : null;
  const from = params.dateFrom ? new Date(params.dateFrom).getTime() : null;
  // The "to" day is included up to its last moment.
  const to = params.dateTo ? new Date(params.dateTo).getTime() + 24 * 60 * 60 * 1000 : null;

  const all = (await backend<ApiAction[]>("GET", "/admin/actions"))
    .filter((a) => !type || (ACTION_TYPES[type] ?? []).includes(a.action))
    .filter((a) => {
      const at = new Date(a.created_at).getTime();
      return (!from || at >= from) && (!to || at < to);
    })
    .map((a) => ({
      id: a.id,
      createdAt: a.created_at,
      action: a.action,
      targetMember: a.target?.full_name ?? "",
      reason: a.reason ?? "",
      by: a.admin?.full_name ?? "",
    }))
    .filter((e) => !search || `${WORDS[e.action] ?? e.action} ${e.targetMember} ${e.reason} ${e.by}`.toLowerCase().includes(search));

  return { data: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize };
}
