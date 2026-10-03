import type { Founder, PaginatedParams, PaginatedResult, TimelineEvent } from "@/types";
import { founders, timelineForFounder } from "./mock-data";
import { delay, paginate } from "./pagination";

function filterFounder(f: Founder, search: string, status?: string): boolean {
  const haystack = `${f.name} ${f.email} ${f.businessName} ${f.county}`.toLowerCase();
  if (search && !haystack.includes(search)) return false;
  if (status && status !== "all" && f.status !== status) return false;
  return true;
}

export async function listFounders(params: PaginatedParams = {}): Promise<PaginatedResult<Founder>> {
  await delay();
  return paginate(founders, params, filterFounder);
}

export async function getFounder(id: string): Promise<Founder | null> {
  await delay();
  return founders.find((f) => f.id === id) ?? null;
}

export async function getFounderTimeline(id: string): Promise<TimelineEvent[]> {
  await delay();
  return timelineForFounder(id);
}

export async function updateFounderStatus(id: string, status: Founder["status"]): Promise<void> {
  await delay();
  const f = founders.find((x) => x.id === id);
  if (f) f.status = status;
}
