"use client";

import { useRouter } from "next/navigation";
import { flexRender, type RowData } from "@tanstack/react-table";
import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef as ColumnDef,
} from "@tanstack/react-table/legacy";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableProps<T extends RowData> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  searchPlaceholder?: string;
  statusFilter?: React.ReactNode;
  onSearchChange?: (value: string) => void;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  className?: string;
  getRowHref?: (row: T) => string;
}

export function DataTable<T extends RowData>({
  columns,
  data,
  total,
  page,
  pageSize,
  searchPlaceholder = "Search…",
  statusFilter,
  onSearchChange,
  onPageChange,
  emptyMessage = "No results found.",
  className,
  getRowHref,
}: DataTableProps<T>) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const table = useLegacyTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize) || 1,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
    onPageChange?.(1);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-muted" aria-hidden />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="min-h-11 w-full rounded-card border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search table"
          />
        </div>
        {statusFilter}
      </div>
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-slate-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 font-semibold text-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const href = getRowHref?.(row.original);
                return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-slate-50/80",
                    href && "cursor-pointer",
                  )}
                  onClick={
                    href
                      ? (e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("a, button")) return;
                          router.push(href);
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {page} of {totalPages} · {total} total
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="min-h-9 px-3"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="min-h-9 px-3"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
