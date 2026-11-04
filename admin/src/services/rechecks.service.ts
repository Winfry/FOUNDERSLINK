import type { RecheckListItem, VerificationDetail } from "@/types";
import { decideRecheck as decideRecheckMock, listRechecks } from "./admin-mock-store";
import { fetchVerificationDetail } from "./verification.http";
import { live } from "@/lib/api";
import * as http from "./rechecks.http";
import { delay } from "./pagination";

export async function fetchRechecks(): Promise<RecheckListItem[]> {
  if (live) return http.fetchRechecks();
  await delay();
  return listRechecks();
}

// Records the admin's answer to a re-check (keep her approved, or suspend
// her) and returns the application as it now stands.
export async function decideRecheck(id: string, outcome: "confirm" | "suspend", reason: string): Promise<VerificationDetail | null> {
  if (live) {
    await http.recordRecheck(id, outcome, reason);
    return fetchVerificationDetail(id);
  }
  await delay();
  return decideRecheckMock(id, outcome, reason);
}
