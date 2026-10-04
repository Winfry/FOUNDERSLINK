"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { MemberDetail } from "@/types";
import { reinstateMemberFormAction, suspendMemberFormAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDay, roleLabel } from "@/components/labels";
import { StatusBadge } from "@/components/status-badge";
import { ToastBanner } from "@/components/toast-banner";
import { Timeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MIN_REASON = 8;
const notGiven = <span className="text-muted">Not given</span>;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function MemberDetailView({ member: initial }: { member: MemberDetail }) {
  const [member, setMember] = useState(initial);
  const [reason, setReason] = useState("");
  const [dialog, setDialog] = useState<"suspend" | "reinstate" | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const suspended = member.memberStatus === "suspended";
  const reasonLength = reason.trim().length;

  function close() {
    setDialog(null);
    setReason("");
  }

  function confirmAction() {
    const kind = dialog;
    if (!kind || reasonLength < MIN_REASON) return;
    startTransition(async () => {
      try {
        const fn = kind === "suspend" ? suspendMemberFormAction : reinstateMemberFormAction;
        const updated = await fn(member.id, reason.trim());
        if (updated) {
          setMember(updated);
          setToast({ text: kind === "suspend" ? "Member suspended. Your reason is in the audit log." : "Member reinstated. Your reason is in the audit log." });
        } else {
          setToast({
            text:
              kind === "suspend"
                ? "Not suspended: only a member whose verification is approved can be suspended."
                : "Not reinstated: only a suspended member can be reinstated.",
            error: true,
          });
        }
      } catch {
        setToast({ text: "Nothing was changed: the server did not answer. Try again.", error: true });
      }
      close();
    });
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <ToastBanner message={toast.text} variant={toast.error ? "error" : "success"} onDismiss={() => setToast(null)} />
      ) : null}

      <section className="rounded-card bg-navy p-6 text-white md:p-8">
        <p className="text-sm font-semibold text-white/70">{roleLabel(member.role)}</p>
        <h1 className="mt-1 break-words text-2xl font-extrabold leading-8">{member.fullName}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={member.memberStatus} />
          <StatusBadge status={member.approvalStatus} />
          <span className="text-xs font-semibold text-white/70">Joined {formatDay(member.joinedAt)}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <dl>
              <Row label="Email">{member.email}</Row>
              <Row label="Phone">{member.phone ?? notGiven}</Row>
              <Row label="County">{member.county ?? notGiven}</Row>
              <Row label="Organisation or business">{member.organisationOrBusiness ?? notGiven}</Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              {member.verificationSummary ?? "This member has not submitted a verification application yet."}
            </p>
            <Link
              href="/verification"
              className="inline-flex min-h-10 items-center rounded-btn border border-border bg-white px-4 text-sm font-bold text-primary hover:border-primary hover:bg-primary-light"
            >
              Open the verification queue
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consents</CardTitle>
            <CardDescription>What this member has allowed FoundersLink to do with their data.</CardDescription>
          </CardHeader>
          <CardContent>
            {member.consents.length === 0 ? (
              <p className="text-sm text-muted">No consent choices are recorded for this member yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {member.consents.map((c) => (
                  <li key={c.purpose} className="flex items-center justify-between gap-4 py-2.5 text-sm font-medium first:pt-0 last:pb-0">
                    <span>{c.label}</span>
                    <Badge variant={c.granted ? "success" : "muted"}>{c.granted ? "Granted" : "Not granted"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports against this member</CardTitle>
          </CardHeader>
          <CardContent>
            {member.reportsAgainst.length === 0 ? (
              <p className="text-sm text-muted">Nobody has reported this member. Reports from other members will be listed here.</p>
            ) : (
              <ul className="divide-y divide-border">
                {member.reportsAgainst.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium text-foreground">{r.reason}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted">{formatDay(r.reportedAt)}</span>
                      <StatusBadge status={r.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline events={member.timeline.map((e) => ({ id: e.id, title: e.title, description: e.description, at: e.at }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{suspended ? "Reinstate this member" : "Suspend this member"}</CardTitle>
          <CardDescription>
            {suspended
              ? "Reinstating gives the member access to FoundersLink again. You will be asked for a written reason."
              : "Suspending stops the member from using FoundersLink until they are reinstated. You will be asked for a written reason."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suspended ? (
            <Button type="button" variant="primary" onClick={() => setDialog("reinstate")}>
              Reinstate member
            </Button>
          ) : (
            <Button type="button" variant="destructive" onClick={() => setDialog("suspend")}>
              Suspend member
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={dialog !== null}
        title={dialog === "suspend" ? `Suspend ${member.fullName}?` : `Reinstate ${member.fullName}?`}
        description="This is recorded in the audit log with your reason."
        confirmLabel={dialog === "suspend" ? "Suspend member" : "Reinstate member"}
        variant={dialog === "suspend" ? "destructive" : "primary"}
        loading={pending}
        confirmDisabled={reasonLength < MIN_REASON}
        onCancel={close}
        onConfirm={confirmAction}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="member-reason" className="text-sm font-semibold text-foreground">
            Written reason <span className="text-destructive">(required)</span>
          </label>
          <textarea
            id="member-reason"
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field resize-y"
          />
          <p className="text-xs font-semibold text-muted">
            {reasonLength >= MIN_REASON ? "Reason written." : `Write at least ${MIN_REASON} characters to turn on the button.`}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
