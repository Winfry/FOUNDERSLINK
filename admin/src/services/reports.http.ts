import type { ReportedMemberRow, ReportedMessageRow } from "@/types";
import { ApiError, backend } from "@/lib/api";

interface ApiPerson {
  id: string;
  full_name: string;
}

interface ApiReports {
  messages: {
    id: string;
    reason: string;
    reporter: ApiPerson;
    message: { id: string; body: string; flagged: boolean; sent_at: string };
    sender: ApiPerson;
    created_at: string;
  }[];
  members: { id: string; reason: string; reporter: ApiPerson; reported: ApiPerson; created_at: string }[];
}

const getReports = () => backend<ApiReports>("GET", "/admin/reports");

// Two things the backend does not have:
// - whether a report has been handled, so every report is "open";
// - who flagged a message. "flagged" is set by the AI service or by the
//   rule-based stand-in, and the answer does not say which, so nothing
//   is labelled an AI warning.
export async function fetchReports(): Promise<{ messages: ReportedMessageRow[]; members: ReportedMemberRow[] }> {
  const reports = await getReports();
  return {
    messages: reports.messages.map((r) => ({
      id: r.id,
      reporterName: r.reporter.full_name,
      reportedMemberName: r.sender.full_name,
      reason: r.reason,
      reportedAt: r.created_at,
      messageText: r.message.body,
      aiWarning: false,
      status: "open" as const,
    })),
    members: reports.members.map((r) => ({
      id: r.id,
      reporterName: r.reporter.full_name,
      reportedMemberName: r.reported.full_name,
      reportedMemberId: r.reported.id,
      reason: r.reason,
      reportedAt: r.created_at,
      aiWarning: false,
      status: "open" as const,
    })),
  };
}

export interface ReportActionResult {
  ok: boolean;
  error?: string;
}

// The only action the backend offers on a report is suspending the
// member. It cannot dismiss a report or warn a member, and saying it
// had would be untrue.
async function act(memberId: string | undefined, action: "dismiss" | "warn" | "suspend", reason: string): Promise<ReportActionResult> {
  if (action !== "suspend") {
    return { ok: false, error: `Not saved: the backend cannot ${action === "warn" ? "warn a member" : "dismiss a report"} yet.` };
  }
  if (!memberId) return { ok: false, error: "This report could not be found." };
  try {
    await backend("POST", `/admin/users/${memberId}/suspend`, { reason });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: `Could not suspend: ${err.message}` };
    throw err;
  }
}

export async function actOnMessageReport(id: string, action: "dismiss" | "warn" | "suspend", reason: string) {
  const report = action === "suspend" ? (await getReports()).messages.find((r) => r.id === id) : undefined;
  return act(report?.sender.id, action, reason);
}

export async function actOnMemberReport(id: string, action: "dismiss" | "warn" | "suspend", reason: string) {
  const report = action === "suspend" ? (await getReports()).members.find((r) => r.id === id) : undefined;
  return act(report?.reported.id, action, reason);
}
