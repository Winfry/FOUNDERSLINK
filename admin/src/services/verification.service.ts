import type { CheckInput, PaginatedParams, PaginatedResult, VerificationDetail, VerificationQueueItem } from "@/types";
import {
  getVerificationDetail,
  listVerificationQueue,
  submitVerificationDecision,
} from "./admin-mock-store";
import { delay, paginate } from "./pagination";
import { live } from "@/lib/api";
import * as http from "./verification.http";

export async function fetchVerificationQueue(
  tab: string,
  params: PaginatedParams = {},
): Promise<PaginatedResult<VerificationQueueItem>> {
  if (live) return http.fetchVerificationQueue(tab, params);
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
  if (live) return http.fetchVerificationDetail(id);
  await delay();
  return getVerificationDetail(id);
}

export async function decideVerification(
  id: string,
  decision: "approved" | "rejected" | "needs_info",
  reason: string,
  checks: CheckInput[],
) {
  if (live) return http.decideVerification(id, decision, reason, checks);
  await delay();
  return submitVerificationDecision(id, decision, reason, checks);
}
