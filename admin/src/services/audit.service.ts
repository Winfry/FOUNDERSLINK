import type { AuditEntry, PaginatedParams, PaginatedResult } from "@/types";
import { auditLog } from "./mock-data";
import { delay, paginate } from "./pagination";

function filterAudit(e: AuditEntry, search: string): boolean {
  const haystack = `${e.actor} ${e.action} ${e.resource}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  return true;
}

export async function listAuditLog(params: PaginatedParams = {}): Promise<PaginatedResult<AuditEntry>> {
  await delay();
  return paginate(auditLog, params, (e, s) => filterAudit(e, s));
}
