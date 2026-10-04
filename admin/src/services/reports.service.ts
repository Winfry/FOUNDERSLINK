import type { ReportedMemberRow, ReportedMessageRow } from "@/types";
import { getReports, handleReportMember, handleReportMessage } from "./admin-mock-store";
import { live } from "@/lib/api";
import * as http from "./reports.http";
import { delay } from "./pagination";

export async function fetchReports(): Promise<{
  messages: ReportedMessageRow[];
  members: ReportedMemberRow[];
}> {
  if (live) return http.fetchReports();
  await delay();
  return getReports();
}

export async function actOnMessageReport(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  if (live) return http.actOnMessageReport(id, action, reason);
  await delay();
  return handleReportMessage(id, action, reason);
}

export async function actOnMemberReport(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  if (live) return http.actOnMemberReport(id, action, reason);
  await delay();
  return handleReportMember(id, action, reason);
}
