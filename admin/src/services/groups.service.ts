import type { InvestmentGroup, PaginatedParams, PaginatedResult } from "@/types";
import { groups } from "./mock-data";
import { delay, paginate } from "./pagination";

function filterGroup(g: InvestmentGroup, search: string, status?: string): boolean {
  const haystack = `${g.name} ${g.founderName} ${g.county}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  if (status && status !== "all" && g.status !== status) return false;
  return true;
}

export async function listGroups(params: PaginatedParams = {}): Promise<PaginatedResult<InvestmentGroup>> {
  await delay();
  return paginate(groups, params, filterGroup);
}

export async function getGroup(id: string): Promise<InvestmentGroup | null> {
  await delay();
  return groups.find((g) => g.id === id) ?? null;
}
