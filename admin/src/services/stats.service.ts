import type { AdminNavCounts, AdminStats } from "@/types";
import { getAdminStats, getNavCounts } from "./admin-mock-store";
import { live } from "@/lib/api";
import * as http from "./stats.http";
import { delay } from "./pagination";

export async function fetchAdminStats(): Promise<AdminStats> {
  if (live) return http.fetchAdminStats();
  await delay();
  return getAdminStats();
}

export async function fetchNavCounts(): Promise<AdminNavCounts> {
  if (live) return http.fetchNavCounts();
  await delay(60);
  return getNavCounts();
}
