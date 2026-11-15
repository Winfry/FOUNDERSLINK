"use client";

import Link from "next/link";
import type { AdminStats } from "@/types";
import { approvalLabel, stageLabel } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Chart colours from the approved design: purple, deep purple, a gold detail, lavender.
const PURPLE = "#5634A5";
const DEEP = "#28184E";
const GOLD = "#E3B65D";
const LAVENDER = "#E4DDF3";
const AXIS = "#9A93A5";
const ROLE_COLOURS = [PURPLE, DEEP, GOLD];
const TICK = { fontSize: 12, fill: AXIS, fontWeight: 400 };
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid " + LAVENDER,
  boxShadow: "0 6px 20px rgba(40, 24, 78, 0.05)",
  fontSize: 13,
  fontWeight: 400,
  color: DEEP,
};

function formatMonth(key: string) {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-KE", { month: "short" });
}

const cardLink = "block rounded-card";
const statHover = "h-full transition-colors hover:border-primary/40";

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
  const learning = stats.learningCirclesCount;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="What needs your attention today, and how the platform is growing." />

      <section className="flex flex-col gap-6 rounded-card border border-border bg-white p-6 shadow-card md:flex-row md:items-center md:justify-between md:p-7">
        <div>
          <p className="text-xs text-muted">Waiting for you</p>
          <p className="mt-2.5 text-[40px] font-light leading-[44px] tracking-tight text-primary">
            {waiting}{" "}
            <span className="text-xl font-light text-navy">{waiting === 1 ? "verification application" : "verification applications"}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {waiting === 0
              ? "The queue is clear. New applications appear here as soon as they are submitted."
              : "Until someone at FoundersLink decides, they see their matches without names and cannot connect."}
          </p>
        </div>
        <Link
          href="/verification"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-white hover:bg-primary-dark"
        >
          {waiting === 0 ? "Open verification" : "Review applications"} →
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/deal-reviews" className={cardLink}>
          {/* The same number as the menu badge and the list it opens (FINAL_VERIFICATION 25). */}
          <StatCard title="Deals waiting for a document review" value={String(stats.dealsWaitingReview)} className={statHover} />
        </Link>
        <Link href="/reports" className={cardLink}>
          <StatCard title="Open reports" note="Not yet dismissed or acted on" value={String(stats.openReports)} className={statHover} />
        </Link>
        <Link href="/rechecks" className={cardLink}>
          <StatCard title="Re-checks due" value={String(stats.rechecksDue)} className={statHover} />
        </Link>
        <Link href="/members?role=founder" className={cardLink}>
          <StatCard title="Founders" value={String(stats.foundersCount)} className={statHover} />
        </Link>
        <Link href="/members?role=investor" className={cardLink}>
          <StatCard title="Investors" value={String(stats.investorsCount)} className={statHover} />
        </Link>
        {stats.expertsCount > 0 ? (
          <Link href="/members?role=expert" className={cardLink}>
            <StatCard title="Experts" value={String(stats.expertsCount)} className={statHover} />
          </Link>
        ) : null}
        <Link href="/chamas" className={cardLink}>
          <StatCard
            title="Chamas"
            note={learning > 0 ? `Plus ${learning} learning ${learning === 1 ? "circle" : "circles"}` : undefined}
            value={String(stats.chamasCount)}
            className={statHover}
          />
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
                  <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: LAVENDER }} />
                  <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="Sign-ups" stroke={PURPLE} strokeWidth={2.5} dot={{ fill: PURPLE, r: 3.5 }} activeDot={{ fill: GOLD, stroke: "#fff", r: 5 }} />
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
                    <li key={d.name} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLOURS[i % ROLE_COLOURS.length] }} aria-hidden />
                      <span className="flex-1">{d.name}</span>
                      <span className="text-primary">{d.value}</span>
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
            <CardDescription>Open deals. Paused and declined ones are not counted. FoundersLink never holds or moves the money.</CardDescription>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No deals have been started yet. Each deal will be counted here by its stage.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: LAVENDER }} />
                    <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: LAVENDER, opacity: 0.5 }} />
                    <Bar dataKey="Deals" fill={PURPLE} radius={[8, 8, 0, 0]} maxBarSize={72} />
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
                  <li key={s.status} className="flex items-center justify-between py-2.5 text-sm text-foreground first:pt-0 last:pb-0">
                    <span>{approvalLabel(s.status)}</span>
                    <span className="text-lg font-light text-primary">{s.count}</span>
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
