"use client";

import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import Link from "next/link";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import type { Investor } from "@/types";
import { formatKes } from "@/lib/utils";
import { listInvestors } from "@/services/investors.service";

const columns: ColumnDef<Investor>[] = [
  {
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/investors/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { header: "Organization", accessorKey: "organization" },
  { header: "County", accessorKey: "county" },
  {
    header: "Invested",
    cell: ({ row }) => formatKes(row.original.totalInvestedKes),
  },
  {
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function InvestorsTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");

  const query = useQuery({
    queryKey: ["investors", page, search],
    queryFn: () => listInvestors({ page, pageSize: 10, search }),
  });

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      total={query.data?.total ?? 0}
      page={page}
      pageSize={10}
      onPageChange={setPage}
      onSearchChange={setSearch}
    />
  );
}
