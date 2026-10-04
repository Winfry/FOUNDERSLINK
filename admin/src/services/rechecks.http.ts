import type { MemberRole, RecheckListItem } from "@/types";
import { backend } from "@/lib/api";

interface ApiRecheck {
  application_id: string;
  user: { id: string; full_name: string; email: string; role: MemberRole; approval_status: string };
  due_at: string;
  reason: string;
  approved_at: string | null;
}

// The id is the vetting application's, which is what the verification
// page and the re-check decision both take.
export async function fetchRechecks(): Promise<RecheckListItem[]> {
  const due = await backend<ApiRecheck[]>("GET", "/admin/vetting/rechecks");
  return due.map((r) => ({
    id: r.application_id,
    memberId: r.user.id,
    fullName: r.user.full_name,
    role: r.user.role,
    lastCheckedAt: r.approved_at ?? "",
    dueReason: r.reason,
  }));
}

// "confirm" keeps her approved for another year. "suspend" suspends her.
export async function recordRecheck(applicationId: string, outcome: "confirm" | "suspend", reason: string) {
  return backend<{ application_id: string; approval_status: string }>("POST", `/admin/vetting/${applicationId}/recheck`, { outcome, reason });
}
