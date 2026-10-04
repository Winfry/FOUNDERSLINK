import type { RecheckListItem } from "@/types";
import { addRecheckAudit, listRechecks } from "./admin-mock-store";
import { live } from "@/lib/api";
import * as http from "./rechecks.http";
import { delay } from "./pagination";

export async function fetchRechecks(): Promise<RecheckListItem[]> {
  if (live) return http.fetchRechecks();
  await delay();
  return listRechecks();
}

// Records the admin's answer to a re-check: keep her approved, or suspend her.
export async function recordRecheck(id: string, memberName: string, outcome: "confirm" | "suspend", reason: string) {
  if (live) return http.recordRecheck(id, outcome, reason);
  await delay();
  addRecheckAudit(memberName, reason);
  return { application_id: id, approval_status: outcome === "suspend" ? "suspended" : "approved" };
}
