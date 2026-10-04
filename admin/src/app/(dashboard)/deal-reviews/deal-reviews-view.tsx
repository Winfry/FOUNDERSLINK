"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import type { DealReviewListItem } from "@/types";
import { EmptyState } from "@/components/empty-state";
import { dealTypeLabel, stageLabel } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";

export function DealReviewsView({ deals }: { deals: DealReviewListItem[] }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal reviews"
        description="Deals where a founder or investor has shared a document that needs FoundersLink to confirm or reject it."
      />
      {deals.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No documents are waiting for review"
          description="When a founder or investor shares a document in a deal, the deal appears here until every document is confirmed or rejected."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <Th>Deal</Th>
                <Th>Between</Th>
                <Th>Type</Th>
                <Th>Stage</Th>
                <Th>Documents waiting</Th>
                <Th>
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </THead>
            <tbody>
              {deals.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <Link href={`/deal-reviews/${d.id}`} className="text-link">
                      {d.title}
                    </Link>
                  </Td>
                  <Td>{d.parties.join(" and ")}</Td>
                  <Td>{dealTypeLabel(d.dealType)}</Td>
                  <Td>
                    <Badge variant="muted">{stageLabel(d.stage)}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={d.documentsWaiting > 0 ? "warning" : "muted"}>{d.documentsWaiting} waiting</Badge>
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/deal-reviews/${d.id}`}
                      className="inline-flex min-h-10 items-center rounded-btn bg-primary px-4 text-sm font-bold text-white hover:bg-primary-dark"
                    >
                      Review
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
