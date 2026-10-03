import type { PaginatedParams, PaginatedResult, PlatformTransaction } from "@/types";
import { platformTransactions } from "./mock-data";
import { delay, paginate } from "./pagination";

function filterTx(tx: PlatformTransaction, search: string): boolean {
  if (!search) return true;
  const haystack = `${tx.groupName} ${tx.memberName} ${tx.reference} ${tx.type}`.toLowerCase();
  return haystack.includes(search.toLowerCase());
}

export async function listCompletedTransactions(
  params: PaginatedParams = {},
): Promise<PaginatedResult<PlatformTransaction>> {
  await delay();
  return paginate(platformTransactions, params, (tx, search) => filterTx(tx, search));
}
