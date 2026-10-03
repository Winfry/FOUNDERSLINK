import type {
  ApplicationStatus,
  DocumentStatus,
  InvestorApplication,
  PaginatedParams,
  PaginatedResult,
  TimelineEvent,
} from "@/types";
import {
  approveApplication,
  getApplication,
  listApplications,
  rejectApplication,
  seedDemoApplications,
} from "../../../shared/application-store";
import { delay, paginate } from "./pagination";

seedDemoApplications();

function mapToInvestor(app: ReturnType<typeof getApplication>): InvestorApplication | null {
  if (!app || app.kind !== "investor") return null;
  const p = app.payload;
  return {
    id: app.id,
    applicantName: app.fullName,
    email: app.email,
    phone: app.phone ?? "",
    county: String(p.county ?? "—"),
    organization: String(p.organization ?? p.applicantType ?? "—"),
    ticketSizeKes: Number(p.ticketSizeKes ?? p.ticket ?? 0),
    status: app.status as ApplicationStatus,
    submittedAt: app.submittedAt,
    rejectionReason: app.rejectionReason,
    payload: app.payload,
    documents: app.documents.map((d) => ({
      id: d.id,
      name: d.name,
      mimeType: d.mimeType,
      status: "pending" as DocumentStatus,
    })),
  };
}

function filterApp(a: InvestorApplication, search: string, status?: string): boolean {
  const haystack = `${a.applicantName} ${a.email} ${a.organization} ${a.county}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  if (status && status !== "all" && a.status !== status) return false;
  return true;
}

export async function listInvestorApplications(
  params: PaginatedParams = {},
): Promise<PaginatedResult<InvestorApplication>> {
  await delay();
  const all = listApplications("investor")
    .map((a) => mapToInvestor(a)!)
    .filter(Boolean);
  return paginate(all, params, filterApp);
}

export async function getInvestorApplication(id: string): Promise<InvestorApplication | null> {
  await delay();
  return mapToInvestor(getApplication(id));
}

export async function getApplicationTimeline(id: string): Promise<TimelineEvent[]> {
  await delay();
  const app = getApplication(id);
  if (!app) return [];
  return [
    { id: "t1", title: "Application submitted", at: app.submittedAt, actor: app.fullName },
    ...(app.status === "approved"
      ? [{ id: "t2", title: "Approved — credentials emailed", at: new Date().toISOString(), actor: "Admin" }]
      : []),
    ...(app.status === "rejected"
      ? [
          {
            id: "t3",
            title: "Rejected",
            description: app.rejectionReason,
            at: new Date().toISOString(),
            actor: "Admin",
          },
        ]
      : []),
  ];
}

export async function approveInvestorApplication(id: string) {
  await delay();
  return approveApplication(id);
}

export async function rejectInvestorApplication(id: string, reason: string) {
  await delay();
  rejectApplication(id, reason);
}

export async function setDocumentStatus(
  applicationId: string,
  documentId: string,
  status: DocumentStatus,
): Promise<void> {
  void applicationId;
  void documentId;
  void status;
  await delay();
}
