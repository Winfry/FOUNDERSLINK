"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";

interface ApplicationReviewFooterProps {
  canReview: boolean;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  approvePreview?: string;
}

export function ApplicationReviewFooter({
  canReview,
  onApprove,
  onReject,
  approvePreview,
}: ApplicationReviewFooterProps) {
  const [dialog, setDialog] = React.useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  if (!canReview) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white p-4 lg:left-64">
        <div className="mx-auto flex max-w-5xl justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog("reject")}>
            Reject
          </Button>
          <Button onClick={() => setDialog("approve")}>Approve</Button>
        </div>
      </div>
      <div className="h-20" aria-hidden />
      <ConfirmDialog
        open={dialog === "approve"}
        title="Approve application?"
        description={approvePreview ?? "The applicant will receive login credentials by email and in-app notification (mock)."}
        confirmLabel="Approve"
        loading={loading}
        onConfirm={async () => {
          setLoading(true);
          await onApprove();
          setLoading(false);
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
      {dialog === "reject" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={() => setDialog(null)} />
          <div className="relative z-10 w-full max-w-md rounded-card border border-border bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold">Reject application</h2>
            <p className="mt-1 text-sm text-muted">The applicant will receive an email with this reason.</p>
            <div className="mt-4">
              <Input
                label="Rejection reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Required"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                loading={loading}
                disabled={reason.trim().length < 3}
                onClick={async () => {
                  setLoading(true);
                  await onReject(reason.trim());
                  setLoading(false);
                  setDialog(null);
                  setReason("");
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
