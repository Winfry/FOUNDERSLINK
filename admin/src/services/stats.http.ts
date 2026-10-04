import type { AdminNavCounts, AdminStats, ApprovalStatus, DealStage } from "@/types";
import { backend } from "@/lib/api";

interface ApiStats {
  members: { total: number; by_role: Record<string, number>; by_status: Record<string, number> };
  applications_waiting: number;
  rechecks_due: number;
  // Every report ever made. The backend does not record whether a
  // report has been handled, so all of them count as open.
  reports: { messages: number; members: number };
  deals: { total: number; by_stage: Record<string, number> };
  circles: { total: number; by_type: Record<string, number> };
  // Newer backends send these two. Older ones do not.
  chamas?: number | { total: number };
  deals_with_documents_waiting?: number;
  registrations: { month: string; founders: number; investors: number; experts: number }[];
}

const getStats = () => backend<ApiStats>("GET", "/admin/stats");

// Money circles only: a learning circle is not a chama.
function chamasOf(s: ApiStats): number {
  if (typeof s.chamas === "number") return s.chamas;
  if (s.chamas && typeof s.chamas.total === "number") return s.chamas.total;
  return s.circles.by_type?.money ?? 0;
}

// The deals with a document waiting for an admin: the same list the
// Deal reviews page shows, so the number matches what it opens.
async function dealsWaiting(s: ApiStats): Promise<number> {
  if (typeof s.deals_with_documents_waiting === "number") return s.deals_with_documents_waiting;
  const waiting = await backend<{ deal: { id: string } }[]>("GET", "/admin/deal-documents");
  return new Set(waiting.map((d) => d.deal.id)).size;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const s = await getStats();
  return {
    foundersCount: s.members.by_role.founder ?? 0,
    investorsCount: s.members.by_role.investor ?? 0,
    expertsCount: s.members.by_role.expert ?? 0,
    membersByStatus: Object.entries(s.members.by_status).map(([status, count]) => ({ status: status as ApprovalStatus, count })),
    verificationsWaiting: s.applications_waiting,
    rechecksDue: s.rechecks_due,
    openReports: s.reports.messages + s.reports.members,
    dealsByStage: Object.entries(s.deals.by_stage).map(([stage, count]) => ({ stage: stage as DealStage, count })),
    chamasCount: chamasOf(s),
    learningCirclesCount: s.circles?.by_type?.learning ?? 0,
    dealsWithDocumentsWaiting: await dealsWaiting(s),
    registrationsByMonth: s.registrations.map((r) => ({ month: r.month, count: r.founders + r.investors + r.experts })),
  };
}

// The numbers beside the menu. "Deal reviews" is the deals with a
// document waiting for an admin, as on the deal reviews page.
export async function fetchNavCounts(): Promise<AdminNavCounts> {
  const s = await getStats();
  return {
    verificationWaiting: s.applications_waiting,
    dealReviews: await dealsWaiting(s),
    openReports: s.reports.messages + s.reports.members,
    rechecksDue: s.rechecks_due,
  };
}
