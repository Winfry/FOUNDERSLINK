"use client";

import { useState, useTransition } from "react";
import { Flag, Info } from "lucide-react";
import type { ReportedMemberRow, ReportedMessageRow } from "@/types";
import { reportMemberAction, reportMessageAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { formatDayTime } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ToastBanner } from "@/components/toast-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";

type Tab = "messages" | "members";
type Row = (ReportedMessageRow | ReportedMemberRow) & { messageText?: string };

const MIN_REASON = 8;

export function ReportsView({
  messages: initialMessages,
  members: initialMembers,
}: {
  messages: ReportedMessageRow[];
  members: ReportedMemberRow[];
}) {
  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState(initialMessages);
  const [members, setMembers] = useState(initialMembers);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState<{ kind: Tab; id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const reasonLength = reason.trim().length;

  function close() {
    setTarget(null);
    setReason("");
  }

  function suspend() {
    const t = target;
    if (!t || reasonLength < MIN_REASON) return;
    startTransition(async () => {
      try {
        const result =
          t.kind === "messages"
            ? await reportMessageAction(t.id, "suspend", reason.trim())
            : await reportMemberAction(t.id, "suspend", reason.trim());
        // The backend says so when it could not do what was asked.
        if (result && "ok" in result && !result.ok) {
          setToast({ text: result.error ?? "Nothing was changed.", error: true });
        } else {
          if (t.kind === "messages") {
            setMessages((list) => list.map((x) => (x.id === t.id ? { ...x, status: "handled" as const } : x)));
          } else {
            setMembers((list) => list.map((x) => (x.id === t.id ? { ...x, status: "handled" as const } : x)));
          }
          setToast({ text: `${t.name} was suspended. Your reason is in the audit log.` });
        }
      } catch {
        setToast({ text: "Nothing was changed: the server did not answer. Try again.", error: true });
      }
      close();
    });
  }

  const rows: Row[] = tab === "messages" ? messages : members;

  return (
    <div className="space-y-6">
      {toast ? (
        <ToastBanner message={toast.text} variant={toast.error ? "error" : "success"} onDismiss={() => setToast(null)} />
      ) : null}
      <PageHeader title="Reports" description="Messages and members that other members have reported to FoundersLink." />

      <div className="flex items-start gap-3 rounded-btn bg-primary-light px-4 py-3 text-sm font-medium text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p>
          The one action you can take from a report today is suspending the reported member. Dismissing a report and
          warning a member are not available yet, so reports stay in this list.
        </p>
      </div>

      <Tabs
        label="Report type"
        items={[
          { id: "messages", label: "Reported messages", count: messages.length },
          { id: "members", label: "Reported members", count: members.length },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={tab === "messages" ? "No messages have been reported" : "No members have been reported"}
          description={
            tab === "messages"
              ? "When a member reports a message in a conversation, it appears here with the message and their reason."
              : "When a member reports another member, it appears here with their reason."
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-base font-medium text-foreground">
                    <span className="font-bold">{row.reporterName}</span> reported{" "}
                    <span className="font-bold">{row.reportedMemberName}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {row.aiWarning ? <Badge variant="warning">Flagged automatically</Badge> : null}
                    <StatusBadge status={row.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Their reason</p>
                  <p className="text-sm font-medium text-foreground">{row.reason}</p>
                </div>
                {row.messageText ? (
                  <div>
                    <p className="text-xs font-semibold text-muted">The reported message</p>
                    <p className="mt-1 rounded-btn border-l-4 border-primary bg-surface px-4 py-3 text-sm font-medium text-foreground">
                      {row.messageText}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted">Reported {formatDayTime(row.reportedAt)}</p>
                  {row.status === "open" ? (
                    <Button type="button" variant="destructive" onClick={() => setTarget({ kind: tab, id: row.id, name: row.reportedMemberName })}>
                      Suspend {row.reportedMemberName}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={target !== null}
        title={`Suspend ${target?.name ?? "this member"}?`}
        description="They will not be able to use FoundersLink until they are reinstated. This is recorded in the audit log with your reason."
        confirmLabel="Suspend member"
        variant="destructive"
        loading={pending}
        confirmDisabled={reasonLength < MIN_REASON}
        onCancel={close}
        onConfirm={suspend}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-reason" className="text-sm font-semibold text-foreground">
            Written reason <span className="text-destructive">(required)</span>
          </label>
          <textarea id="report-reason" rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} className="field resize-y" />
          <p className="text-xs font-semibold text-muted">
            {reasonLength >= MIN_REASON ? "Reason written." : `Write at least ${MIN_REASON} characters to turn on the button.`}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
