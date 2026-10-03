"use client";

import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import Link from "next/link";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import type { InvestorApplication } from "@/types";
import { formatDate, formatKes } from "@/lib/utils";
import { listInvestorApplications } from "@/services/investor-applications.service";

const columns: ColumnDef<InvestorApplication>[] = [
  {
    header: "Applicant",
    cell: ({ row }) => (
      <Link
        href={`/investor-applications/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.applicantName}
      </Link>
    ),
  },
  { header: "Organization", accessorKey: "organization" },
  { header: "County", accessorKey: "county" },
  {
    header: "Ticket size",
    cell: ({ row }) => formatKes(row.original.ticketSizeKes),
  },
  {
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    header: "Submitted",
    cell: ({ row }) => formatDate(row.original.submittedAt),
  },
];

export function ApplicationsTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const query = useQuery({
    queryKey: ["investor-applications", page, search, status],
    queryFn: () => listInvestorApplications({ page, pageSize: 10, search, status }),
  });

  const statusFilter = (
    <select
      className="min-h-11 rounded-card border border-border bg-white px-3 text-sm"
      value={status}
      onChange={(e) => {
        setStatus(e.target.value);
        setPage(1);
      }}
      aria-label="Filter by status"
    >
      <option value="all">All statuses</option>
      <option value="pending">Pending</option>
      <option value="under_review">Under review</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
  );

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      total={query.data?.total ?? 0}
      page={page}
      pageSize={10}
      onPageChange={setPage}
      onSearchChange={setSearch}
      statusFilter={statusFilter}
    />
  );
}
