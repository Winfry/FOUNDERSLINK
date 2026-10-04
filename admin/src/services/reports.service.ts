import type { ReportedMemberRow, ReportedMessageRow } from "@/types";
import { getReports, handleReportMember, handleReportMessage } from "./admin-mock-store";
import { delay } from "./pagination";

export async function fetchReports(): Promise<{
  messages: ReportedMessageRow[];
  members: ReportedMemberRow[];
}> {
  await delay();
  return getReports();
}

export async function actOnMessageReport(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  await delay();
  return handleReportMessage(id, action, reason);
}

export async function actOnMemberReport(
  id: string,
  action: "dismiss" | "warn" | "suspend",
  reason: string,
) {
  await delay();
  return handleReportMember(id, action, reason);
}
