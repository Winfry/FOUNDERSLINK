import type { ReportedMemberRow, ReportedMessageRow } from "@/types";
import { ApiError, backend } from "@/lib/api";

interface ApiPerson {
  id: string;
  full_name: string;
}

interface ApiHandled {
  at: string;
  by: ApiPerson | null;
  outcome: "dismissed" | "suspended";
  note: string | null;
}

interface ApiReports {
  messages: {
    id: string;
    reason: string;
    reporter: ApiPerson;
    message: { id: string; body: string; flagged: boolean; sent_at: string };
    sender: ApiPerson | null;
    created_at: string;
    handled: ApiHandled | null;
  }[];
  members: { id: string; reason: string; reporter: ApiPerson; reported: ApiPerson; created_at: string; handled: ApiHandled | null }[];
}

// Open until an admin handles it; then how, by whom and why.
const handling = (h: ApiHandled | null) =>
  h
    ? { status: "handled" as const, handledOutcome: h.outcome, handledBy: h.by?.full_name, handledAt: h.at, handledNote: h.note ?? undefined }
    : { status: "open" as const };

const getReports = () => backend<ApiReports>("GET", "/admin/reports");

// One thing the backend does not have: who flagged a message. "flagged" is set by the AI service or by the
//   rule-based stand-in, and the answer does not say which, so nothing
//   is labelled an AI warning.
export async function fetchReports(): Promise<{ messages: ReportedMessageRow[]; members: ReportedMemberRow[] }> {
  const reports = await getReports();
  return {
    messages: reports.messages.map((r) => ({
      id: r.id,
      reporterName: r.reporter.full_name,
      reportedMemberName: r.sender?.full_name ?? "A member who has left",
      reason: r.reason,
      reportedAt: r.created_at,
      messageText: r.message.body,
      aiWarning: false,
      ...handling(r.handled),
    })),
    members: reports.members.map((r) => ({
      id: r.id,
      reporterName: r.reporter.full_name,
      reportedMemberName: r.reported.full_name,
      reportedMemberId: r.reported.id,
      reason: r.reason,
      reportedAt: r.created_at,
      aiWarning: false,
      ...handling(r.handled),
    })),
  };
}

export interface ReportActionResult {
  ok: boolean;
  error?: string;
}

// Closes a report: dismiss it, or suspend the member it is about (which
// closes every open report about her). Warning a member is not something
// the backend can do, so it is not offered.
async function resolve(kind: "messages" | "members", id: string, action: "dismiss" | "suspend", reason: string): Promise<ReportActionResult> {
  try {
    await backend("POST", `/admin/reports/${kind}/${id}/resolve`, { outcome: action, reason });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: `Not saved: ${err.message}.` };
    throw err;
  }
}

export const actOnMessageReport = (id: string, action: "dismiss" | "suspend", reason: string) => resolve("messages", id, action, reason);
export const actOnMemberReport = (id: string, action: "dismiss" | "suspend", reason: string) => resolve("members", id, action, reason);
