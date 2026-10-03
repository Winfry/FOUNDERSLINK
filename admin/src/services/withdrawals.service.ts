import type { PaginatedParams, PaginatedResult, Withdrawal, WithdrawalStatus } from "@/types";
import { withdrawals } from "./mock-data";
import { delay, paginate } from "./pagination";

function filterWithdrawal(w: Withdrawal, search: string, status?: string): boolean {
  const haystack = `${w.founderName} ${w.reference} ${w.mpesaNumber}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  if (status && status !== "all" && w.status !== status) return false;
  return true;
}

export async function listWithdrawals(
  params: PaginatedParams = {},
): Promise<PaginatedResult<Withdrawal>> {
  await delay();
  return paginate(withdrawals, params, filterWithdrawal);
}

export async function updateWithdrawalStatus(id: string, status: WithdrawalStatus): Promise<void> {
  await delay();
  const w = withdrawals.find((x) => x.id === id);
  if (w) w.status = status;
}
