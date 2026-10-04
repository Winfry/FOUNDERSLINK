"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { RecheckListItem } from "@/types";
import { recheckDecisionAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { formatDay, roleLabel } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";

type Outcome = "confirm" | "suspend";
const MIN_REASON = 8;

export function RechecksView({ items }: { items: RecheckListItem[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState<{ row: RecheckListItem; outcome: Outcome } | null>(null);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  function ask(row: RecheckListItem, outcome: Outcome) {
    setReason("");
    setRefused(null);
    setDone(null);
    setOpen({ row, outcome });
  }

  function close() {
    if (busy) return;
    setOpen(null);
  }

  async function decide() {
    if (!open || reason.trim().length < MIN_REASON) return;
    setBusy(true);
    setRefused(null);
    try {
      const result = await recheckDecisionAction(open.row.id, open.row.fullName, open.outcome, reason.trim());
      if (result.ok) {
        setDone(
          open.outcome === "suspend"
            ? `${open.row.fullName} is suspended and has been told why.`
            : `${open.row.fullName} stays approved. The re-check is recorded.`,
        );
        setOpen(null);
        router.refresh();
      } else {
        setRefused(result.message);
      }
    } catch {
      setRefused("That did not go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const suspending = open?.outcome === "suspend";
  const short = reason.trim().length < MIN_REASON;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Re-checks"
        description="Approved members whose verification is due another look, because time has passed or something changed. Confirm that she is still fine, or suspend her."
      />
      {done ? (
        <p role="status" className="rounded-btn bg-primary-light px-4 py-3 text-sm font-semibold text-foreground">
          {done}
        </p>
      ) : null}
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
                <Th>Last approved</Th>
                <Th>What changed and why it is due</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <tbody>
              {items.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <Link href={`/members/${row.memberId}`} className="font-semibold text-primary hover:underline">
                      {row.fullName}
                    </Link>
                    {row.email ? <span className="block text-sm text-muted">{row.email}</span> : null}
                  </Td>
                  <Td>{roleLabel(row.role)}</Td>
                  <Td className="whitespace-nowrap">{row.lastCheckedAt ? formatDay(row.lastCheckedAt) : "Never"}</Td>
                  <Td>
                    <span className="block">{row.dueReason || "No reason was recorded."}</span>
                    {row.dueAt ? <span className="block text-sm text-muted">Due since {formatDay(row.dueAt)}</span> : null}
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="secondary" className="whitespace-nowrap" onClick={() => ask(row, "confirm")}>
                        Confirm, still fine
                      </Button>
                      <Button variant="destructive" onClick={() => ask(row, "suspend")}>
                        Suspend
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <ConfirmDialog
        open={open !== null}
        title={open ? (suspending ? `Suspend ${open.row.fullName}?` : `Confirm ${open.row.fullName} is still fine?`) : ""}
        description={
          suspending
            ? "She will be suspended and told why, in the words you write below. She cannot connect, chat or work on deals until an admin reinstates her."
            : "She stays approved and comes back to this list when her next re-check is due. Your reason is recorded in the audit log."
        }
        confirmLabel={suspending ? "Suspend" : "Confirm, still fine"}
        variant={suspending ? "destructive" : "primary"}
        loading={busy}
        confirmDisabled={short}
        onConfirm={decide}
        onCancel={close}
      >
        <label htmlFor="recheck-reason" className="text-sm font-semibold text-foreground">
          {suspending ? "Why are you suspending her?" : "What did you check?"}
        </label>
        <textarea
          id="recheck-reason"
          className="field mt-1.5 min-h-24"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby="recheck-reason-help"
        />
        <p id="recheck-reason-help" className="mt-1.5 text-sm text-muted">
          Write at least {MIN_REASON} characters.{suspending ? " The member will be told this reason." : ""}
        </p>
        {refused ? (
          <p role="alert" className="mt-3 rounded-btn bg-destructive-light px-4 py-3 text-sm font-semibold text-destructive">
            {refused}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
