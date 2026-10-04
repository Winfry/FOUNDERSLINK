import type { AuditEntry, PaginatedParams, PaginatedResult } from "@/types";
import { listAuditLog } from "./admin-mock-store";
import { live } from "@/lib/api";
import * as http from "./audit.http";
import { delay, paginate } from "./pagination";

export async function fetchAuditLog(params: PaginatedParams = {}): Promise<PaginatedResult<AuditEntry>> {
  if (live) return http.fetchAuditLog(params);
  await delay();
  const items = listAuditLog();
  return paginate(items, params, (entry, search, actionType) => {
    if (actionType && actionType !== "all" && !entry.action.toLowerCase().includes(actionType.toLowerCase())) {
      return false;
    }
    const from = params.dateFrom ? new Date(params.dateFrom).getTime() : null;
    const to = params.dateTo ? new Date(params.dateTo).getTime() : null;
    const at = new Date(entry.createdAt).getTime();
    if (from && at < from) return false;
    if (to && at > to) return false;
    if (!search) return true;
    const hay = `${entry.action} ${entry.targetMember} ${entry.reason}`.toLowerCase();
    return hay.includes(search);
  });
}
