"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table/legacy";
import type { VerificationQueueItem } from "@/types";
import { DataTable } from "@/components/data-table";
import { RiskLevelBadge } from "@/components/risk-level-badge";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "waiting", label: "Waiting" },
  { id: "needs_info", label: "Needs more info" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Suspended" },
] as const;

export function VerificationView({
  tab,
  role,
  page,
  result,
}: {
  tab: string;
  role: string;
  page: number;
  result: { data: VerificationQueueItem[]; total: number; pageSize: number };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function updateQuery(next: Record<string, string | number | undefined>) {
    const q = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, String(v));
    });
    router.push(`/verification?${q.toString()}`);
  }

  const columns: ColumnDef<VerificationQueueItem, unknown>[] = [
    { header: "Name", accessorKey: "fullName" },
    { header: "Role", accessorKey: "role", cell: ({ row }) => <span className="capitalize">{row.original.role}</span> },
    {
      header: "Risk level",
      accessorKey: "riskLevel",
      cell: ({ row }) => <RiskLevelBadge level={row.original.riskLevel} />,
    },
    {
      header: "Top risk signal",
      accessorKey: "topRiskSignal",
      cell: ({ row }) => row.original.topRiskSignal ?? "—",
    },
    {
      header: "Submitted",
      accessorKey: "submittedAt",
      cell: ({ row }) => new Date(row.original.submittedAt).toLocaleDateString("en-KE"),
    },
    {
      header: "Status",
      accessorKey: "approvalStatus",
      cell: ({ row }) => <span className="capitalize">{row.original.approvalStatus.replace(/_/g, " ")}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Verification</h1>
        <p className="text-sm text-muted">Risk signals guide your review — you make every decision.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => updateQuery({ tab: t.id, page: 1 })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === t.id ? "bg-[#0454DB] text-white" : "bg-white text-foreground hover:bg-[#EAF1FE]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={result.data}
        total={result.total}
        page={page}
        pageSize={result.pageSize}
        searchPlaceholder="Search by name or email"
        onSearchChange={(s) => updateQuery({ search: s, page: 1 })}
        onPageChange={(p) => updateQuery({ page: p })}
        getRowHref={(row) => `/verification/${row.id}`}
        statusFilter={
          <select
            className="min-h-11 rounded-md border border-border bg-white px-3 text-sm"
            value={role}
            onChange={(e) => updateQuery({ role: e.target.value, page: 1 })}
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            <option value="founder">Founder</option>
            <option value="investor">Investor</option>
            <option value="expert">Expert</option>
          </select>
        }
        emptyMessage="No members in this verification tab."
      />
      <p className="text-xs text-muted">
        Queue sorted by risk level. Open a row to review details.{" "}
        <Link href="/verification" className="text-[#0454DB] underline">
          Refresh list
        </Link>
      </p>
    </div>
  );
}
