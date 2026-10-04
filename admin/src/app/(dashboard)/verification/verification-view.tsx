"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import type { VerificationQueueItem } from "@/types";
import { DataTable } from "@/components/data-table";
import { formatDay, roleLabel } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { RiskLevelBadge } from "@/components/risk-level-badge";
import { StatusBadge } from "@/components/status-badge";
import { Tabs } from "@/components/ui/tabs";

const TABS = [
  { id: "waiting", label: "Waiting" },
  { id: "needs_info", label: "Needs more info" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Suspended" },
] as const;

const EMPTY: Record<string, { title: string; text: string }> = {
  waiting: {
    title: "No applications are waiting",
    text: "When a founder or investor submits a verification application, it appears here for you to review.",
  },
  needs_info: {
    title: "Nobody has been asked for more information",
    text: "Applications you mark as “Needs more info” wait here until the member replies.",
  },
  approved: { title: "No approved members yet", text: "Members you approve are listed here." },
  rejected: { title: "No rejected applications", text: "Applications you reject are listed here with your reason." },
  suspended: { title: "No suspended members", text: "Members you suspend are listed here until they are reinstated." },
};

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
  const filtered = Boolean(params.get("search")) || role !== "all";

  function updateQuery(next: Record<string, string | number | undefined>) {
    const q = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, String(v));
    });
    router.push(`/verification?${q.toString()}`);
  }

  const columns: ColumnDef<VerificationQueueItem, unknown>[] = [
    {
      header: "Name",
      accessorKey: "fullName",
      cell: ({ row }) => (
        <div>
          <Link href={`/verification/${row.original.id}`} className="text-link">
            {row.original.fullName}
          </Link>
          <p className="text-xs font-medium text-muted">{row.original.email}</p>
        </div>
      ),
    },
    { header: "Role", accessorKey: "role", cell: ({ row }) => roleLabel(row.original.role) },
    {
      header: "Risk level",
      accessorKey: "riskLevel",
      cell: ({ row }) => <RiskLevelBadge level={row.original.riskLevel} />,
    },
    {
      header: "Top risk signal",
      accessorKey: "topRiskSignal",
      cell: ({ row }) =>
        row.original.topRiskSignal ? (
          <span className="text-foreground">{row.original.topRiskSignal}</span>
        ) : (
          <span className="text-muted">None found</span>
        ),
    },
    {
      header: "Submitted",
      accessorKey: "submittedAt",
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDay(row.original.submittedAt)}</span>,
    },
    {
      header: "Status",
      accessorKey: "approvalStatus",
      cell: ({ row }) => <StatusBadge status={row.original.approvalStatus} />,
    },
  ];

  const empty = EMPTY[tab] ?? EMPTY.waiting;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification"
        description="Applications from founders and investors, highest risk first. Risk signals guide your review; you make every decision."
      />
      <Tabs label="Verification status" items={TABS} active={tab} onChange={(id) => updateQuery({ tab: id, page: 1 })} />
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
            className="field"
            value={role}
            onChange={(e) => updateQuery({ role: e.target.value, page: 1 })}
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            <option value="founder">Founders</option>
            <option value="investor">Investors</option>
          </select>
        }
        emptyTitle={filtered ? "No one matches that search or filter" : empty.title}
        emptyMessage={filtered ? "Clear the search or choose “All roles” to see everyone in this tab." : empty.text}
      />
    </div>
  );
}
