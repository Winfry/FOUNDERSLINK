"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { RecheckListItem } from "@/types";
import { EmptyState } from "@/components/empty-state";
import { formatDay, roleLabel } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";

export function RechecksView({ items }: { items: RecheckListItem[] }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Re-checks"
        description="Approved members whose verification is due another look, because time has passed or something changed."
      />
      {items.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No re-checks are due"
          description="Approved members come back to this list when it is time to look at their verification again."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Last checked</Th>
                <Th>Why it is due</Th>
                <Th>
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </THead>
            <tbody>
              {items.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-semibold">{row.fullName}</Td>
                  <Td>{roleLabel(row.role)}</Td>
                  <Td className="whitespace-nowrap">{row.lastCheckedAt ? formatDay(row.lastCheckedAt) : "Never"}</Td>
                  <Td className="text-muted">{row.dueReason}</Td>
                  <Td className="text-right">
                    <Link
                      href={row.id.startsWith("rc-") ? `/verification/vet-${row.memberId}` : `/verification/${row.id}`}
                      className="inline-flex min-h-10 items-center whitespace-nowrap rounded-btn border border-border bg-white px-4 text-sm font-bold text-primary hover:border-primary hover:bg-primary-light"
                    >
                      Review verification
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
