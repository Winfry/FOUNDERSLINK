"use client";

import Link from "next/link";
import type { AdminStats } from "@/types";
import { StatCard } from "@/components/stat-card";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  Users,
  UsersRound,
  FileBarChart,
} from "lucide-react";

const BLUE = "#1D4ED8";
const BLUE_DARK = "#1E3A8A";
const CHART_BLUES = ["#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];

function formatMonth(key: string) {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-KE", { month: "short" });
}

export function OverviewView({ stats }: { stats: AdminStats }) {
  const lineData = stats.registrationsByMonth.map((r) => ({
    name: formatMonth(r.month),
    signUps: r.count,
  }));

  const barData = stats.dealsByStage.map((d) => ({
    name: d.stage.replace(/_/g, " "),
    count: d.count,
  }));

  const donutData = [
    { name: "Founders", value: stats.foundersCount },
    { name: "Investors", value: stats.investorsCount },
    { name: "Experts", value: stats.expertsCount },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted">Platform activity at a glance — no payment volumes are recorded here.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/members?role=founder">
          <StatCard title="Founders" value={String(stats.foundersCount)} icon={Users} className="h-full hover:border-[#1D4ED8]" />
        </Link>
        <Link href="/members?role=investor">
          <StatCard title="Investors" value={String(stats.investorsCount)} icon={Users} className="h-full hover:border-[#1D4ED8]" />
        </Link>
        <Link href="/members?role=expert">
          <StatCard title="Experts" value={String(stats.expertsCount)} icon={Users} className="h-full hover:border-[#1D4ED8]" />
        </Link>
        <Link href="/verification">
          <StatCard title="Verifications waiting" value={String(stats.verificationsWaiting)} icon={ShieldCheck} className="h-full hover:border-[#1D4ED8]" />
        </Link>
        <Link href="/rechecks">
          <StatCard title="Re-checks due" value={String(stats.rechecksDue)} icon={RefreshCw} className="h-full hover:border-[#1D4ED8]" />
        </Link>
        <Link href="/reports">
          <StatCard title="Open reports" value={String(stats.openReports)} icon={FileBarChart} className="h-full hover:border-[#1D4ED8]" />
        </Link>
        <Link href="/deal-reviews">
          <StatCard
            title="Deals in due diligence"
            value={String(stats.dealsByStage.find((d) => d.stage === "due_diligence")?.count ?? 0)}
            icon={ClipboardCheck}
            className="h-full hover:border-[#1D4ED8]"
          />
        </Link>
        <Link href="/chamas">
          <StatCard title="Chamas" value={String(stats.chamasCount)} icon={UsersRound} className="h-full hover:border-[#1D4ED8]" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Sign-ups (last 6 months)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="signUps" stroke={BLUE} strokeWidth={2} dot={{ fill: BLUE }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-card border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-foreground">Members by role</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={CHART_BLUES[i % CHART_BLUES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-white p-4">
        <h2 className="text-sm font-semibold text-foreground">Deals by stage</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={BLUE_DARK} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-card border border-border bg-[#EFF6FF] p-4">
        <h2 className="text-sm font-semibold text-[#1E3A8A]">Members by verification status</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {stats.membersByStatus.map((s) => (
            <li key={s.status} className="rounded-md bg-white px-3 py-1.5 text-sm text-foreground">
              <span className="font-medium capitalize">{s.status.replace(/_/g, " ")}</span>
              <span className="ml-2 text-[#1D4ED8]">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
