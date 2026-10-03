import type { DashboardStats, PlatformTransaction } from "@/types";
import {
  chartMonthlyRegistrations,
  chartVolumeKes,
  founders,
  investorApplications,
  investors,
  platformTransactions,
} from "./mock-data";
import { delay } from "./pagination";

export async function getDashboardStats(): Promise<DashboardStats> {
  await delay();
  return {
    totalFounders: founders.length + 128,
    pendingApplications: investorApplications.filter((a) => a.status === "pending").length,
    activeInvestors: investors.filter((i) => i.status === "active").length,
    pendingWithdrawals: 0,
    monthlyVolumeKes: 3_200_000,
  };
}

export async function getVolumeChart() {
  await delay();
  return chartVolumeKes;
}

export async function getRegistrationChart() {
  await delay();
  return chartMonthlyRegistrations;
}

export async function getRecentTransactions(): Promise<PlatformTransaction[]> {
  await delay();
  return platformTransactions.slice(0, 10);
}
