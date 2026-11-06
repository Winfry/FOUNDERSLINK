import type { AdminNavCounts, AdminStats, ApprovalStatus, DealStage } from "@/types";
import { backend } from "@/lib/api";

interface ApiStats {
  members: { total: number; by_role: Record<string, number>; by_status: Record<string, number> };
  applications_waiting: number;
  rechecks_due: number;
  // Open reports: the ones no admin has handled yet.
  reports: { messages: number; members: number };
  // Open deals; `waiting_review` is the deal reviews list's own number.
  deals: { total: number; by_stage: Record<string, number>; waiting_review: number };
  circles: { total: number; by_type: Record<string, number> };
  registrations: { month: string; founders: number; investors: number; experts: number }[];
}

const getStats = () => backend<ApiStats>("GET", "/admin/stats");

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
    dealsWaitingReview: s.deals.waiting_review,
    // A learning circle is not a chama (FINAL_VERIFICATION 25).
    chamasCount: s.circles.by_type.money ?? 0,
    learningCirclesCount: s.circles.by_type.learning ?? 0,
    registrationsByMonth: s.registrations.map((r) => ({ month: r.month, count: r.founders + r.investors + r.experts })),
  };
}

// The numbers beside the menu. "Deal reviews" is the deals with a
// document waiting for an admin, as on the deal reviews page.
export async function fetchNavCounts(): Promise<AdminNavCounts> {
  const s = await getStats();
  return {
    verificationWaiting: s.applications_waiting,
    dealReviews: s.deals.waiting_review,
    openReports: s.reports.messages + s.reports.members,
    rechecksDue: s.rechecks_due,
  };
}
