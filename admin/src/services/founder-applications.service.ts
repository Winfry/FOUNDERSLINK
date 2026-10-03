import type { ApplicationStatus, FounderApplication, PaginatedParams, PaginatedResult } from "@/types";
import {
  approveApplication,
  getApplication,
  listApplications,
  rejectApplication,
  seedDemoApplications,
} from "../../../shared/application-store";
import { delay, paginate } from "./pagination";

seedDemoApplications();

function mapToFounder(app: ReturnType<typeof getApplication>): FounderApplication | null {
  if (!app || app.kind !== "founder") return null;
  const p = app.payload;
  return {
    id: app.id,
    applicantName: app.fullName,
    email: app.email,
    phone: app.phone ?? "",
    businessName: String(p.businessName ?? "—"),
    sector: String(p.sectorId ?? p.sector ?? "—"),
    county: String(p.county ?? "—"),
    stage: String(p.stage ?? "—"),
    fundingTargetKes: Number(p.fundingTargetKes ?? 0),
    status: app.status as ApplicationStatus,
    submittedAt: app.submittedAt,
    rejectionReason: app.rejectionReason,
    payload: app.payload,
    documents: app.documents.map((d) => ({ id: d.id, name: d.name, mimeType: d.mimeType })),
  };
}

function filterApp(a: FounderApplication, search: string, status?: string): boolean {
  const haystack = `${a.applicantName} ${a.email} ${a.businessName}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  if (status && status !== "all" && a.status !== status) return false;
  return true;
}

export async function listFounderApplications(
  params: PaginatedParams = {},
): Promise<PaginatedResult<FounderApplication>> {
  await delay();
  const all = listApplications("founder")
    .map((a) => mapToFounder(a)!)
    .filter(Boolean);
  return paginate(all, params, filterApp);
}

export async function getFounderApplication(id: string): Promise<FounderApplication | null> {
  await delay();
  return mapToFounder(getApplication(id));
}

export async function approveFounderApplication(id: string) {
  await delay();
  return approveApplication(id);
}

export async function rejectFounderApplication(id: string, reason: string) {
  await delay();
  rejectApplication(id, reason);
}
