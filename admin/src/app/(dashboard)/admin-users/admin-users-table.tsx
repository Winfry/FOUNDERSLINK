"use client";

import { useQuery } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import type { AdminUser } from "@/types";
import { ROLE_LABELS } from "@/lib/auth/config";
import { formatDate } from "@/lib/utils";
import { listAdminUsers } from "@/services/admin-users.service";

const columns: ColumnDef<AdminUser>[] = [
  { header: "Name", accessorKey: "name" },
  { header: "Email", accessorKey: "email" },
  {
    header: "Role",
    cell: ({ row }) => <Badge>{ROLE_LABELS[row.original.role]}</Badge>,
  },
  {
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    header: "Last login",
    cell: ({ row }) => (row.original.lastLogin ? formatDate(row.original.lastLogin) : "—"),
  },
];

export function AdminUsersTable() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");

  const query = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => listAdminUsers({ page, pageSize: 10, search }),
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
