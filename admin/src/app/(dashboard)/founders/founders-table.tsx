"use client";

import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import Link from "next/link";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import type { Founder } from "@/types";
import { formatDate } from "@/lib/utils";
import { listFounders } from "@/services/founders.service";

const columns: ColumnDef<Founder>[] = [
  {
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/founders/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { header: "Business", accessorKey: "businessName" },
  { header: "County", accessorKey: "county" },
  { header: "Sector", accessorKey: "sector" },
  {
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    header: "Joined",
    cell: ({ row }) => formatDate(row.original.joinedAt),
  },
];

export function FoundersTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const query = useQuery({
    queryKey: ["founders", page, search, status],
    queryFn: () => listFounders({ page, pageSize: 10, search, status }),
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
      <option value="active">Active</option>
      <option value="pending_kyc">Pending KYC</option>
      <option value="suspended">Suspended</option>
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
      searchPlaceholder="Search founders, business, county…"
    />
  );
}
