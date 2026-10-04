import type { AdminNavCounts, AdminStats } from "@/types";
import { getAdminStats, getNavCounts } from "./admin-mock-store";
import { delay } from "./pagination";

export async function fetchAdminStats(): Promise<AdminStats> {
  await delay();
  return getAdminStats();
}

export async function fetchNavCounts(): Promise<AdminNavCounts> {
  await delay(60);
  return getNavCounts();
}
