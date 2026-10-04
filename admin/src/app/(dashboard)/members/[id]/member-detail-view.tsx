"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { MemberDetail } from "@/types";
import { reinstateMemberFormAction, suspendMemberFormAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ToastBanner } from "@/components/toast-banner";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MemberDetailView({ member: initial }: { member: MemberDetail }) {
  const [member, setMember] = useState(initial);
  const [reason, setReason] = useState("");
  const [dialog, setDialog] = useState<"suspend" | "reinstate" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmAction() {
    if (!dialog || reason.trim().length < 8) return;
    startTransition(async () => {
      const fn = dialog === "suspend" ? suspendMemberFormAction : reinstateMemberFormAction;
      const updated = await fn(member.id, reason.trim());
      if (updated) {
        setMember(updated);
        setToast(dialog === "suspend" ? "Member suspended." : "Member reinstated.");
        setReason("");
        setDialog(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {toast ? <ToastBanner message={toast} onDismiss={() => setToast(null)} /> : null}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{member.fullName}</h1>
        <p className="text-sm text-muted capitalize">
          {member.role} · {member.memberStatus} · {member.approvalStatus.replace(/_/g, " ")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted">Email:</span> {member.email}
            </p>
            <p>
              <span className="text-muted">Phone:</span> {member.phone ?? "—"}
            </p>
            <p>
              <span className="text-muted">County:</span> {member.county ?? "—"}
            </p>
            <p>
              <span className="text-muted">Organisation or business:</span> {member.organisationOrBusiness ?? "—"}
            </p>
            <p>
              <span className="text-muted">Joined:</span> {new Date(member.joinedAt).toLocaleDateString("en-KE")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{member.verificationSummary ?? "No verification summary."}</p>
            <Link href={`/verification`} className="mt-2 inline-block text-[#1D4ED8] hover:underline">
              Open verification queue
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consents granted</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {member.consents.map((c) => (
              <li key={c.purpose} className="flex justify-between gap-4">
                <span>{c.label}</span>
                <span className={c.granted ? "text-[#1D4ED8] font-medium" : "text-muted"}>{c.granted ? "Yes" : "No"}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports against this member</CardTitle>
        </CardHeader>
        <CardContent>
          {member.reportsAgainst.length === 0 ? (
            <p className="text-sm text-muted">No reports.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {member.reportsAgainst.map((r) => (
                <li key={r.id}>
                  {r.reason} — {new Date(r.reportedAt).toLocaleDateString("en-KE")} ({r.status})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline
            events={member.timeline.map((e) => ({
              id: e.id,
              title: e.title,
              description: e.description,
              at: e.at,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input label="Reason (required for suspend or reinstate)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {member.memberStatus === "active" ? (
              <Button type="button" variant="destructive" disabled={reason.trim().length < 8} onClick={() => setDialog("suspend")}>
                Suspend
              </Button>
            ) : (
              <Button type="button" variant="success" disabled={reason.trim().length < 8} onClick={() => setDialog("reinstate")}>
                Reinstate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={dialog !== null}
        title={dialog === "suspend" ? "Suspend this member?" : "Reinstate this member?"}
        description="This will be recorded in the audit log with your reason."
        confirmLabel={dialog === "suspend" ? "Suspend" : "Reinstate"}
        variant={dialog === "suspend" ? "destructive" : "primary"}
        loading={pending}
        onCancel={() => setDialog(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}
