import Link from "next/link";
import { UsersRound } from "lucide-react";
import type { ChamaListItem } from "@/types";
import { EmptyState } from "@/components/empty-state";
import { formatDay } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";

export function ChamasView({ chamas }: { chamas: ChamaListItem[] }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamas"
        description="Savings and learning groups that members run in the app. FoundersLink records contributions; it never holds or moves money."
      />
      {chamas.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Chamas cannot be listed here yet"
          description="The dashboard cannot read chamas from the FoundersLink server yet, so this list is empty even when members have created some. Nothing is broken. The number of chamas is on the Overview page."
          action={
            <Link
              href="/overview"
              className="inline-flex min-h-10 items-center rounded-btn border border-border bg-white px-4 text-sm font-bold text-primary hover:border-primary hover:bg-primary-light"
            >
              Go to overview
            </Link>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <Th>Chama</Th>
                <Th>Type</Th>
                <Th>Members</Th>
                <Th>Organiser</Th>
                <Th>Created</Th>
              </tr>
            </THead>
            <tbody>
              {chamas.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/chamas/${c.id}`} className="text-link">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>{c.type === "money" ? "Savings" : "Learning"}</Td>
                  <Td>{c.memberCount}</Td>
                  <Td>{c.organiserName}</Td>
                  <Td className="whitespace-nowrap">{formatDay(c.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
