"use client";

import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import Link from "next/link";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import type { InvestmentGroup } from "@/types";
import { formatKes } from "@/lib/utils";
import { listGroups } from "@/services/groups.service";

const columns: ColumnDef<InvestmentGroup>[] = [
  {
    header: "Group",
    cell: ({ row }) => (
      <Link href={`/groups/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { header: "Founder", accessorKey: "founderName" },
  { header: "County", accessorKey: "county" },
  {
    header: "Raised / target",
    cell: ({ row }) =>
      `${formatKes(row.original.raisedKes)} / ${formatKes(row.original.targetKes)}`,
  },
  { header: "Members", accessorKey: "memberCount" },
  {
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function GroupsTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");

  const query = useQuery({
    queryKey: ["groups", page, search],
    queryFn: () => listGroups({ page, pageSize: 10, search }),
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
