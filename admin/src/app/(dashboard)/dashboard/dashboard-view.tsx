"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, ClipboardList, TrendingUp, Users } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatDate, formatKes } from "@/lib/utils";
import {
  getDashboardStats,
  getRecentTransactions,
  getVolumeChart,
} from "@/services/dashboard.service";

const PRIMARY = "#1D4ED8";

export function DashboardView() {
  const statsQuery = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });
  const volQuery = useQuery({ queryKey: ["dashboard-vol"], queryFn: getVolumeChart });
  const txQuery = useQuery({ queryKey: ["dashboard-recent-tx"], queryFn: getRecentTransactions });

  const stats = statsQuery.data;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Total founders"
          value={stats ? String(stats.totalFounders) : "—"}
          icon={Users}
        />
        <StatCard
          title="Pending applications"
          value={stats ? String(stats.pendingApplications) : "—"}
          icon={ClipboardList}
        />
        <StatCard
          title="Active investors"
          value={stats ? String(stats.activeInvestors) : "—"}
          icon={Briefcase}
        />
        <StatCard
          title="Monthly volume"
          value={stats ? formatKes(stats.monthlyVolumeKes) : "—"}
          icon={TrendingUp}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mb-6 rounded-card border border-border bg-[#FAFAFA] p-4 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Investment volume (KES thousands)</h2>
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volQuery.data ?? []}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} domain={[1000, 40000]} />
              <Tooltip formatter={(v) => formatKes(Number(v ?? 0) * 1000)} />
              <Line
                type="monotone"
                dataKey="volume"
                name="Volume (K)"
                stroke={PRIMARY}
                strokeWidth={2}
                dot={{ fill: PRIMARY, r: 3 }}
                activeDot={{ r: 5, fill: PRIMARY }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-card border border-border bg-white">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Recent transactions</h2>
          <p className="text-xs text-muted">Latest 10 completed on the platform</p>
        </div>
        <ul className="divide-y divide-border">
          {(txQuery.data ?? []).map((tx) => (
            <li key={tx.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{tx.groupName}</p>
                <p className="text-xs text-muted">
                  {tx.type === "deposit" ? "Deposit" : "Withdrawal"} · {tx.memberName} · {tx.reference}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:text-right">
                <span className="text-sm font-semibold text-foreground">{formatKes(tx.amountKes)}</span>
                <span className="text-xs text-muted">{formatDate(tx.completedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
