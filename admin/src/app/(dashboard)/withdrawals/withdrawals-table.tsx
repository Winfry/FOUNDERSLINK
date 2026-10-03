"use client";

import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import type { PlatformTransaction } from "@/types";
import { formatDate, formatKes } from "@/lib/utils";
import { listCompletedTransactions } from "@/services/transactions.service";

export function WithdrawalsTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");

  const query = useQuery({
    queryKey: ["platform-transactions", page, search],
    queryFn: () => listCompletedTransactions({ page, pageSize: 10, search }),
  });

  const columns: ColumnDef<PlatformTransaction>[] = [
    { header: "Group", accessorKey: "groupName" },
    {
      header: "Type",
      cell: ({ row }) => (row.original.type === "deposit" ? "Deposit" : "Withdrawal"),
    },
    { header: "Member", accessorKey: "memberName" },
    {
      header: "Amount",
      cell: ({ row }) => formatKes(row.original.amountKes),
    },
    { header: "Reference", accessorKey: "reference" },
    {
      header: "Completed",
      cell: ({ row }) => formatDate(row.original.completedAt),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      total={query.data?.total ?? 0}
      page={page}
      pageSize={10}
      onPageChange={setPage}
      onSearchChange={setSearch}
      searchPlaceholder="Search group, member, reference…"
      emptyMessage="No completed transactions yet."
    />
  );
}
