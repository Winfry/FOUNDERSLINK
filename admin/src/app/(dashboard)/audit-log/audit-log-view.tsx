"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import type { AuditEntry } from "@/types";
import { DataTable } from "@/components/data-table";
import { auditActionLabel, formatDayTime } from "@/components/labels";
import { PageHeader } from "@/components/page-header";

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

  const filtered = Boolean(params.get("search")) || actionType !== "all" || Boolean(dateFrom) || Boolean(dateTo);

  const columns: ColumnDef<AuditEntry, unknown>[] = [
    {
      header: "Date and time",
      accessorKey: "createdAt",
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDayTime(row.original.createdAt)}</span>,
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: ({ row }) => <span className="font-semibold">{auditActionLabel(row.original.action)}</span>,
    },
    { header: "By", accessorKey: "by", cell: ({ row }) => row.original.by || <span className="text-muted">Not recorded</span> },
    { header: "Member", accessorKey: "targetMember", cell: ({ row }) => row.original.targetMember || <span className="text-muted">None</span> },
    {
      header: "Reason",
      accessorKey: "reason",
      cell: ({ row }) => row.original.reason || <span className="text-muted">No reason recorded</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every decision and action an admin has taken, with who took it and the written reason. Entries cannot be edited."
      />
      <DataTable
        columns={columns}
        data={result.data}
        total={result.total}
        page={page}
        pageSize={result.pageSize}
        searchPlaceholder="Search by member, admin or reason"
        onSearchChange={(s) => updateQuery({ search: s, page: 1 })}
        onPageChange={(p) => updateQuery({ page: p })}
        statusFilter={
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="audit-from" className="text-xs font-semibold text-muted">
                From
              </label>
              <input id="audit-from" type="date" value={dateFrom} onChange={(e) => updateQuery({ dateFrom: e.target.value, page: 1 })} className="field !w-auto" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="audit-to" className="text-xs font-semibold text-muted">
                To
              </label>
              <input id="audit-to" type="date" value={dateTo} onChange={(e) => updateQuery({ dateTo: e.target.value, page: 1 })} className="field !w-auto" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="audit-action" className="text-xs font-semibold text-muted">
                Kind of action
              </label>
              <select id="audit-action" className="field" value={actionType} onChange={(e) => updateQuery({ actionType: e.target.value, page: 1 })}>
                <option value="all">All actions</option>
                <option value="verification">Verification decisions</option>
                <option value="member">Suspensions and reinstatements</option>
                <option value="document">Documents</option>
                <option value="recheck">Re-checks</option>
              </select>
            </div>
          </div>
        }
        emptyTitle={filtered ? "No entries match those filters" : "No admin actions yet"}
        emptyMessage={
          filtered
            ? "Clear the dates, the search or the kind of action to see every entry."
            : "When an admin approves, rejects, suspends or confirms something, it is recorded here with the reason."
        }
      />
    </div>
  );
}
