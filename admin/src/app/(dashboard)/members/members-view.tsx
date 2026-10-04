"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table/legacy";
import type { MemberListItem, MemberRole } from "@/types";
import { DataTable } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { exportMembersCsvAction } from "@/app/actions/admin-actions";

const ROLES: { id: MemberRole; label: string }[] = [
  { id: "founder", label: "Founders" },
  { id: "investor", label: "Investors" },
  { id: "expert", label: "Experts" },
];

export function MembersView({
  role,
  page,
  result,
}: {
  role: MemberRole;
  page: number;
  result: { data: MemberListItem[]; total: number; pageSize: number };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") ?? "all";

  function updateQuery(next: Record<string, string | number | undefined>) {
    const q = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, String(v));
    });
    router.push(`/members?${q.toString()}`);
  }

  async function downloadCsv() {
    const csv = await exportMembersCsvAction(role);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${role}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: ColumnDef<MemberListItem, unknown>[] = [
    { header: "Name", accessorKey: "fullName" },
    { header: "Organisation or business", accessorKey: "organisationOrBusiness", cell: ({ row }) => row.original.organisationOrBusiness ?? "—" },
    { header: "Status", accessorKey: "memberStatus", cell: ({ row }) => <span className="capitalize">{row.original.memberStatus}</span> },
    {
      header: "Joined",
      accessorKey: "joinedAt",
      cell: ({ row }) => new Date(row.original.joinedAt).toLocaleDateString("en-KE"),
    },
    {
      header: "Verification",
      accessorKey: "approvalStatus",
      cell: ({ row }) => <span className="capitalize">{row.original.approvalStatus.replace(/_/g, " ")}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted">Founders, investors and experts on FounderLink.</p>
        </div>
        <Button type="button" variant="secondary" onClick={downloadCsv}>
          Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => updateQuery({ role: r.id, page: 1 })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              role === r.id ? "bg-[#0454DB] text-white" : "bg-white text-foreground hover:bg-[#EAF1FE]",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={result.data}
        total={result.total}
        page={page}
        pageSize={result.pageSize}
        searchPlaceholder="Search members"
        onSearchChange={(s) => updateQuery({ search: s, page: 1 })}
        onPageChange={(p) => updateQuery({ page: p })}
        getRowHref={(row) => `/members/${row.id}`}
        statusFilter={
          <select
            className="min-h-11 rounded-md border border-border bg-white px-3 text-sm"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="approved">Verification approved</option>
            <option value="in_review">In review</option>
          </select>
        }
        emptyMessage="No members match your filters."
      />
      <Link href={`/members/${result.data[0]?.id ?? ""}`} className="hidden">
        detail
      </Link>
    </div>
  );
}
