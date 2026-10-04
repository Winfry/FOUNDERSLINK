"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Download } from "lucide-react";
import type { MemberListItem, MemberRole } from "@/types";
import { DataTable } from "@/components/data-table";
import { formatDay } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { exportMembersCsvAction } from "@/app/actions/admin-actions";

const ROLES: { id: MemberRole; label: string }[] = [
  { id: "founder", label: "Founders" },
  { id: "investor", label: "Investors" },
];
// Experts are no longer a role people can choose. The tab is offered only
// when someone opens the list of the few accounts that still have it.
const EXPERT_TAB = { id: "expert" as MemberRole, label: "Experts" };

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
  const filtered = Boolean(params.get("search")) || status !== "all";
  const tabs = role === "expert" ? [...ROLES, EXPERT_TAB] : ROLES;
  const plural = role === "founder" ? "founders" : role === "investor" ? "investors" : "experts";

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
    {
      header: "Name",
      accessorKey: "fullName",
      cell: ({ row }) => (
        <div>
          <Link href={`/members/${row.original.id}`} className="text-link">
            {row.original.fullName}
          </Link>
          <p className="text-xs font-medium text-muted">{row.original.email}</p>
        </div>
      ),
    },
    {
      header: "Organisation or business",
      accessorKey: "organisationOrBusiness",
      cell: ({ row }) => row.original.organisationOrBusiness ?? <span className="text-muted">Not given</span>,
    },
    { header: "Account", accessorKey: "memberStatus", cell: ({ row }) => <StatusBadge status={row.original.memberStatus} /> },
    {
      header: "Verification",
      accessorKey: "approvalStatus",
      cell: ({ row }) => <StatusBadge status={row.original.approvalStatus} />,
    },
    {
      header: "Joined",
      accessorKey: "joinedAt",
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDay(row.original.joinedAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Everyone with a FoundersLink account. Open a member to see their profile, consents and history."
        actions={
          <Button type="button" variant="secondary" onClick={downloadCsv}>
            <Download className="h-4 w-4" aria-hidden />
            Download {plural} as CSV
          </Button>
        }
      />
      <Tabs label="Member role" items={tabs} active={role} onChange={(id) => updateQuery({ role: id, page: 1 })} />
      <DataTable
        columns={columns}
        data={result.data}
        total={result.total}
        page={page}
        pageSize={result.pageSize}
        searchPlaceholder="Search by name or email"
        onSearchChange={(s) => updateQuery({ search: s, page: 1 })}
        onPageChange={(p) => updateQuery({ page: p })}
        getRowHref={(row) => `/members/${row.id}`}
        statusFilter={
          <select
            className="field"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Account active</option>
            <option value="suspended">Account suspended</option>
            <option value="approved">Verification approved</option>
            <option value="in_review">Verification in review</option>
          </select>
        }
        emptyTitle={filtered ? "No one matches that search or filter" : `No ${plural} yet`}
        emptyMessage={
          filtered
            ? "Clear the search or choose “All statuses” to see everyone."
            : `When ${plural} create an account in the FoundersLink app, they are listed here.`
        }
      />
    </div>
  );
}
