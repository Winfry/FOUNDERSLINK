"use client";

import Link from "next/link";
import type { AdminStats } from "@/types";
import { approvalLabel, stageLabel } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ClipboardCheck, FileBarChart, RefreshCw, Users, UsersRound } from "lucide-react";

// Chart colours come from the theme variables in globals.css.
const PRIMARY = "rgb(var(--primary))";
const NAVY = "rgb(var(--navy))";
const MUTED = "rgb(var(--muted))";
const ROLE_COLOURS = [PRIMARY, NAVY, "#8FB4F5"];
const TICK = { fontSize: 12, fill: MUTED, fontWeight: 600 };
const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid rgb(var(--border))", fontSize: 14, fontWeight: 600 };

function formatMonth(key: string) {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-KE", { month: "short" });
}

const cardLink = "block rounded-card";
const statHover = "h-full hover:border-primary";

export function OverviewView({ stats }: { stats: AdminStats }) {
  const lineData = stats.registrationsByMonth.map((r) => ({ name: formatMonth(r.month), "Sign-ups": r.count }));
  const barData = stats.dealsByStage.map((d) => ({ name: stageLabel(d.stage), Deals: d.count }));
  const roleData = [
    { name: "Founders", value: stats.foundersCount },
    { name: "Investors", value: stats.investorsCount },
    // Experts are no longer offered as a role: shown only if real accounts have it.
    { name: "Experts", value: stats.expertsCount },
  ].filter((d) => d.value > 0);
  const waiting = stats.verificationsWaiting;
  const dueDiligence = stats.dealsByStage.find((d) => d.stage === "due_diligence")?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="What needs your attention today, and how the platform is growing." />

      <section className="flex flex-col gap-6 rounded-card bg-navy p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <p className="text-sm font-semibold text-white/70">Waiting for you</p>
          <p className="mt-1 text-[40px] font-extrabold leading-[48px]">
            {waiting} <span className="text-xl font-bold">{waiting === 1 ? "verification application" : "verification applications"}</span>
          </p>
          <p className="mt-1 text-base text-white/80">
            {waiting === 0
              ? "The queue is clear. New applications appear here as soon as they are submitted."
              : "Founders and investors cannot be matched until someone at FoundersLink decides."}
          </p>
        </div>
        <Link
          href="/verification"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-btn bg-white px-5 text-sm font-bold text-primary hover:bg-primary-light focus-visible:outline-white"
        >
          {waiting === 0 ? "Open verification" : "Review applications"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/deal-reviews" className={cardLink}>
          <StatCard title="Deals in due diligence" value={String(dueDiligence)} icon={ClipboardCheck} className={statHover} />
        </Link>
        <Link href="/reports" className={cardLink}>
          <StatCard title="Open reports" value={String(stats.openReports)} icon={FileBarChart} className={statHover} />
        </Link>
        <Link href="/rechecks" className={cardLink}>
          <StatCard title="Re-checks due" value={String(stats.rechecksDue)} icon={RefreshCw} className={statHover} />
        </Link>
        <Link href="/members?role=founder" className={cardLink}>
          <StatCard title="Founders" value={String(stats.foundersCount)} icon={Users} className={statHover} />
        </Link>
        <Link href="/members?role=investor" className={cardLink}>
          <StatCard title="Investors" value={String(stats.investorsCount)} icon={Users} className={statHover} />
        </Link>
        {stats.expertsCount > 0 ? (
          <Link href="/members?role=expert" className={cardLink}>
            <StatCard title="Experts" value={String(stats.expertsCount)} icon={Users} className={statHover} />
          </Link>
        ) : null}
        <Link href="/chamas" className={cardLink}>
          <StatCard title="Chamas" value={String(stats.chamasCount)} icon={UsersRound} className={statHover} />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New sign-ups</CardTitle>
            <CardDescription>Members who joined in each of the last six months.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: "rgb(var(--border))" }} />
                  <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="Sign-ups" stroke={PRIMARY} strokeWidth={3} dot={{ fill: PRIMARY, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Members by role</CardTitle>
          </CardHeader>
          <CardContent>
            {roleData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No members have joined yet. The split between founders and investors will show here.</p>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="none">
                        {roleData.map((_, i) => (
                          <Cell key={i} fill={ROLE_COLOURS[i % ROLE_COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 space-y-2">
                  {roleData.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="h-3 w-3 rounded-full" style={{ background: ROLE_COLOURS[i % ROLE_COLOURS.length] }} aria-hidden />
                      <span className="flex-1">{d.name}</span>
                      <span>{d.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Deals by stage</CardTitle>
            <CardDescription>FoundersLink tracks the stage of each deal. It never holds or moves the money.</CardDescription>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No deals have been started yet. Each deal will be counted here by its stage.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: "rgb(var(--border))" }} />
                    <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgb(var(--primary-tint))" }} />
                    <Bar dataKey="Deals" fill={PRIMARY} radius={[8, 8, 0, 0]} maxBarSize={72} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Members by verification status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.membersByStatus.length === 0 ? (
              <p className="text-sm text-muted">No members yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.membersByStatus.map((s) => (
                  <li key={s.status} className="flex items-center justify-between py-2.5 text-sm font-semibold text-foreground first:pt-0 last:pb-0">
                    <span>{approvalLabel(s.status)}</span>
                    <span className="text-base font-bold">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
