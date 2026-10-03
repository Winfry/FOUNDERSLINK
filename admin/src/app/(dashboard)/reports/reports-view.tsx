"use client";

import { useQuery } from "@tanstack/react-query";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRegistrationChart, getVolumeChart } from "@/services/dashboard.service";

const COLORS = ["#1D4ED8", "#16A34A", "#D97706", "#64748B"];

export function ReportsView() {
  const regQuery = useQuery({ queryKey: ["reports-reg"], queryFn: getRegistrationChart });
  const volQuery = useQuery({ queryKey: ["reports-vol"], queryFn: getVolumeChart });

  const sectorBreakdown = [
    { name: "AgriTech", value: 35 },
    { name: "Logistics", value: 22 },
    { name: "Clean energy", value: 18 },
    { name: "Other", value: 25 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" type="button">
          Export CSV (stub)
        </Button>
        <Button variant="secondary" type="button">
          Export PDF (stub)
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volume trend</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            {volQuery.data?.map((row) => (
              <p key={row.month}>
                {row.month}: KES {(row.volume / 1_000_000).toFixed(1)}M
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Founder sectors</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sectorBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {sectorBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registration summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          {regQuery.data?.map((row) => (
            <div key={row.month} className="rounded-card border border-border p-3">
              <p className="font-semibold text-foreground">{row.month}</p>
              <p className="text-muted">{row.founders} founders · {row.investors} investors</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
