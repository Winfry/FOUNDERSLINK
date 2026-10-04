import type { ComplianceSourceRow } from "@/types";
import { listComplianceSources, markComplianceReviewed } from "./admin-mock-store";
import { live } from "@/lib/api";
import * as http from "./compliance-sources.http";
import { delay } from "./pagination";

export async function fetchComplianceSources(): Promise<ComplianceSourceRow[]> {
  if (live) return http.fetchComplianceSources();
  await delay();
  return listComplianceSources();
}

export async function reviewComplianceSource(id: string, note: string) {
  // The backend has no way to record a review yet, so nothing is saved.
  if (live) return null;
  await delay();
  return markComplianceReviewed(id, note);
}
