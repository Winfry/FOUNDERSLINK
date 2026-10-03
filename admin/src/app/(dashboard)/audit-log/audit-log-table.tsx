"use client";

import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import type { AuditEntry } from "@/types";
import { formatDate } from "@/lib/utils";
import { listAuditLog } from "@/services/audit.service";

const columns: ColumnDef<AuditEntry>[] = [
  {
    header: "Time",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  { header: "Actor", accessorKey: "actor" },
  { header: "Action", accessorKey: "action" },
  { header: "Resource", accessorKey: "resource" },
  { header: "IP", accessorKey: "ipAddress" },
];

export function AuditLogTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");

  const query = useQuery({
    queryKey: ["audit-log", page, search],
    queryFn: () => listAuditLog({ page, pageSize: 10, search }),
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
      searchPlaceholder="Search actor, action, resource…"
    />
  );
}
