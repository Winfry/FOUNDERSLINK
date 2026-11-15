"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { flexRender, type RowData } from "@tanstack/react-table";
import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef as ColumnDef,
} from "@tanstack/react-table/legacy";
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
  emptyTitle?: string;
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
  emptyTitle = "Nothing to show",
  emptyMessage = "Nothing matches yet. Try a different search or filter.",
  className,
  getRowHref,
}: DataTableProps<T>) {
  const router = useRouter();
  // Starts from what the address already says, so the box and the list agree after a reload.
  const [search, setSearch] = React.useState(useSearchParams().get("search") ?? "");
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
    // The page that owns the table goes back to its first page itself.
    // Asking for page 1 here as well overwrote the search it had just set.
    onSearchChange?.(value);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="field rounded-full px-4"
            aria-label={searchPlaceholder}
          />
        </div>
        {statusFilter}
      </div>
      <div className="overflow-x-auto rounded-card border border-border bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-5 py-3 text-xs font-normal text-[#9A93A5]">
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
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <p className="text-2xl font-light text-navy">{emptyTitle}</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const href = getRowHref?.(row.original);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-background",
                      href && "cursor-pointer hover:bg-primary-light/60",
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
                      <td key={cell.id} className="px-5 py-3.5 align-middle text-foreground">
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
      {total > 0 ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            {total === 1 ? "1 result" : `${total} results`} · page {page} of {totalPages}
          </span>
          {totalPages > 1 ? (
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
                ← Previous
              </Button>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
                Next →
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
