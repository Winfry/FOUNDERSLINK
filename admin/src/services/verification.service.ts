import type { PaginatedParams, PaginatedResult, VerificationDetail, VerificationQueueItem } from "@/types";
import {
  getVerificationDetail,
  listVerificationQueue,
  submitVerificationDecision,
} from "./admin-mock-store";
import { delay, paginate } from "./pagination";

export async function fetchVerificationQueue(
  tab: string,
  params: PaginatedParams = {},
): Promise<PaginatedResult<VerificationQueueItem>> {
  await delay();
  const items = listVerificationQueue(tab);
  return paginate(items, params, (item, search, status) => {
    if (status && status !== "all" && item.role !== status) return false;
    if (!search) return true;
    const hay = `${item.fullName} ${item.email}`.toLowerCase();
    return hay.includes(search);
  });
}

export async function fetchVerificationDetail(id: string): Promise<VerificationDetail | null> {
  await delay();
  return getVerificationDetail(id);
}

export async function decideVerification(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: { checkType: string; result: "passed" | "failed"; method: "manual" | "provider" }[],
) {
  await delay();
  return submitVerificationDecision(id, decision, reason, checks);
}
