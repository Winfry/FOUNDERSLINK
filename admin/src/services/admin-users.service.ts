import type { AdminUser, PaginatedParams, PaginatedResult } from "@/types";
import { adminUsers } from "./mock-data";
import { delay, paginate } from "./pagination";

function filterAdmin(u: AdminUser, search: string, status?: string): boolean {
  const haystack = `${u.name} ${u.email} ${u.role}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  if (status && status !== "all" && u.status !== status) return false;
  return true;
}

export async function listAdminUsers(params: PaginatedParams = {}): Promise<PaginatedResult<AdminUser>> {
  await delay();
  return paginate(adminUsers, params, filterAdmin);
}
