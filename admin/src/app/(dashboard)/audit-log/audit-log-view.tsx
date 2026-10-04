"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table/legacy";
import type { AuditEntry } from "@/types";
import { DataTable } from "@/components/data-table";

export function AuditLogView({
  page,
  result,
}: {
  page: number;
  result: { data: AuditEntry[]; total: number; pageSize: number };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const actionType = params.get("actionType") ?? "all";
  const dateFrom = params.get("dateFrom") ?? "";
  const dateTo = params.get("dateTo") ?? "";

  function updateQuery(next: Record<string, string | number | undefined>) {
    const q = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, String(v));
    });
    router.push(`/audit-log?${q.toString()}`);
  }

  const columns: ColumnDef<AuditEntry, unknown>[] = [
    {
      header: "Date and time",
      accessorKey: "createdAt",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("en-KE"),
    },
    { header: "Action", accessorKey: "action" },
    { header: "Target member", accessorKey: "targetMember" },
    { header: "Reason", accessorKey: "reason" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit log</h1>
        <p className="text-sm text-muted">Every admin decision and action with a written reason.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => updateQuery({ dateFrom: e.target.value, page: 1 })}
          className="min-h-11 rounded-md border border-border px-3 text-sm"
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => updateQuery({ dateTo: e.target.value, page: 1 })}
          className="min-h-11 rounded-md border border-border px-3 text-sm"
          aria-label="To date"
        />
      </div>
      <DataTable
        columns={columns}
        data={result.data}
        total={result.total}
        page={page}
        pageSize={result.pageSize}
        searchPlaceholder="Search audit log"
        onSearchChange={(s) => updateQuery({ search: s, page: 1 })}
        onPageChange={(p) => updateQuery({ page: p })}
        statusFilter={
          <select
            className="min-h-11 rounded-md border border-border bg-white px-3 text-sm"
            value={actionType}
            onChange={(e) => updateQuery({ actionType: e.target.value, page: 1 })}
            aria-label="Filter by action"
          >
            <option value="all">All actions</option>
            <option value="verification">Verification</option>
            <option value="document">Document</option>
            <option value="member">Member</option>
            <option value="report">Report</option>
            <option value="compliance">Compliance</option>
          </select>
        }
        emptyMessage="No audit entries yet."
      />
    </div>
  );
}
