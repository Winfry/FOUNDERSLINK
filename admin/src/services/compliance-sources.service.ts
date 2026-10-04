import type { ComplianceSourceRow } from "@/types";
import { listComplianceSources, markComplianceReviewed } from "./admin-mock-store";
import { delay } from "./pagination";

export async function fetchComplianceSources(): Promise<ComplianceSourceRow[]> {
  await delay();
  return listComplianceSources();
}

export async function reviewComplianceSource(id: string, note: string) {
  await delay();
  return markComplianceReviewed(id, note);
}
