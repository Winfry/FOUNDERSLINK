import type { Investor, PaginatedParams, PaginatedResult } from "@/types";
import { investors } from "./mock-data";
import { delay, paginate } from "./pagination";

function filterInvestor(i: Investor, search: string, status?: string): boolean {
  const haystack = `${i.name} ${i.email} ${i.organization} ${i.county}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  if (status && status !== "all" && i.status !== status) return false;
  return true;
}

export async function listInvestors(params: PaginatedParams = {}): Promise<PaginatedResult<Investor>> {
  await delay();
  return paginate(investors, params, filterInvestor);
}

export async function getInvestor(id: string): Promise<Investor | null> {
  await delay();
  return investors.find((i) => i.id === id) ?? null;
}

export async function updateInvestorStatus(id: string, status: Investor["status"]): Promise<void> {
  await delay();
  const inv = investors.find((x) => x.id === id);
  if (inv) inv.status = status;
}
