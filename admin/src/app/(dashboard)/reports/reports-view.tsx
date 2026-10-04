"use client";

import { useState, useTransition } from "react";
import type { ReportedMemberRow, ReportedMessageRow } from "@/types";
import { reportMemberAction, reportMessageAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ToastBanner } from "@/components/toast-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "messages" | "members";

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
  const [pendingAction, setPendingAction] = useState<{
    kind: Tab;
    id: string;
    action: "dismiss" | "warn" | "suspend";
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction() {
    if (!pendingAction) return;
    const needsReason = pendingAction.action !== "dismiss";
    if (needsReason && reason.trim().length < 8) return;
    startTransition(async () => {
      const r = needsReason ? reason.trim() : "Dismissed — no further action.";
      const result =
        pendingAction.kind === "messages"
          ? await reportMessageAction(pendingAction.id, pendingAction.action, r)
          : await reportMemberAction(pendingAction.id, pendingAction.action, r);
      // The backend says so when it could not do what was asked.
      if (result && "ok" in result && !result.ok) {
        setToast(result.error ?? "The report was not changed.");
        setPendingAction(null);
        setReason("");
        return;
      }
      if (pendingAction.kind === "messages") {
        setMessages((list) => list.map((x) => (x.id === pendingAction.id ? { ...x, status: "handled" as const } : x)));
      } else {
        setMembers((list) => list.map((x) => (x.id === pendingAction.id ? { ...x, status: "handled" as const } : x)));
      }
      setToast("Report marked as handled.");
      setPendingAction(null);
      setReason("");
    });
  }

  const rows = tab === "messages" ? messages : members;

  return (
    <div className="space-y-4">
      {toast ? <ToastBanner message={toast} onDismiss={() => setToast(null)} /> : null}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted">Reported messages and members — AI warnings are guidance only.</p>
      </div>
      <div className="flex gap-2">
        {(["messages", "members"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize",
              tab === t ? "bg-[#0454DB] text-white" : "bg-white hover:bg-[#EAF1FE]",
            )}
          >
            {t === "messages" ? "Reported messages" : "Reported members"}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-muted">No open reports.</div>
      ) : (
        <div className="space-y-4">
          {tab === "messages"
            ? messages.map((row) => (
                <div key={row.id} className="rounded-card border border-border bg-white p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p>
                      <span className="font-medium">{row.reporterName}</span> reported{" "}
                      <span className="font-medium">{row.reportedMemberName}</span>
                    </p>
                    {row.aiWarning ? (
                      <span className="rounded-full bg-[#113373] px-2 py-0.5 text-xs font-semibold text-white">AI warning</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-muted">{row.reason}</p>
                  <p className="mt-2 rounded-md bg-[#EAF1FE] p-2 text-foreground">&ldquo;{row.messageText}&rdquo;</p>
                  <p className="mt-1 text-xs text-muted">{new Date(row.reportedAt).toLocaleString("en-KE")}</p>
                  {row.status === "open" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => setPendingAction({ kind: "messages", id: row.id, action: "dismiss" })}>
                        Dismiss
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setPendingAction({ kind: "messages", id: row.id, action: "warn" })}>
                        Warn member
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => setPendingAction({ kind: "messages", id: row.id, action: "suspend" })}>
                        Suspend member
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-[#0454DB]">Handled</p>
                  )}
                </div>
              ))
            : members.map((row) => (
                <div key={row.id} className="rounded-card border border-border bg-white p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p>
                      <span className="font-medium">{row.reporterName}</span> reported{" "}
                      <span className="font-medium">{row.reportedMemberName}</span>
                    </p>
                    {row.aiWarning ? (
                      <span className="rounded-full bg-[#113373] px-2 py-0.5 text-xs font-semibold text-white">AI warning</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-muted">{row.reason}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(row.reportedAt).toLocaleString("en-KE")}</p>
                  {row.status === "open" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => setPendingAction({ kind: "members", id: row.id, action: "dismiss" })}>
                        Dismiss
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setPendingAction({ kind: "members", id: row.id, action: "warn" })}>
                        Warn member
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => setPendingAction({ kind: "members", id: row.id, action: "suspend" })}>
                        Suspend member
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-[#0454DB]">Handled</p>
                  )}
                </div>
              ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title="Confirm report action"
        description={
          pendingAction?.action === "dismiss"
            ? "Dismiss this report?"
            : "Add a written reason below, then confirm."
        }
        confirmLabel="Mark as handled"
        variant={pendingAction?.action === "suspend" ? "destructive" : "primary"}
        loading={pending}
        onCancel={() => {
          setPendingAction(null);
          setReason("");
        }}
        onConfirm={runAction}
      />
      {pendingAction && pendingAction.action !== "dismiss" ? (
        <div className="max-w-md">
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      ) : null}
    </div>
  );
}
