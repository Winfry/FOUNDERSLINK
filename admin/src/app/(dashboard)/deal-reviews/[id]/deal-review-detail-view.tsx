"use client";

import { useState, useTransition } from "react";
import type { DealReviewDetail } from "@/types";
import { confirmDocumentAction, rejectDocumentAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentViewer } from "@/components/document-viewer";
import { ToastBanner } from "@/components/toast-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatKes(amount: number | null) {
  if (amount == null) return "—";
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function DealReviewDetailView({ deal: initial }: { deal: DealReviewDetail }) {
  const [deal, setDeal] = useState(initial);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDoc(documentId: string) {
    startTransition(async () => {
      await confirmDocumentAction(deal.id, documentId);
      setDeal((d) => ({
        ...d,
        documents: d.documents.map((doc) =>
          doc.id === documentId ? { ...doc, adminStatus: "confirmed" as const } : doc,
        ),
      }));
      setToast("Document marked as Confirmed by FounderLink.");
    });
  }

  function rejectDoc() {
    if (!rejectId || rejectReason.trim().length < 8) return;
    startTransition(async () => {
      await rejectDocumentAction(deal.id, rejectId, rejectReason.trim());
      setDeal((d) => ({
        ...d,
        documents: d.documents.map((doc) =>
          doc.id === rejectId ? { ...doc, adminStatus: "rejected" as const, rejectionReason: rejectReason.trim() } : doc,
        ),
      }));
      setToast("Document rejected.");
      setRejectId(null);
      setRejectReason("");
    });
  }

  return (
    <div className="space-y-6">
      {toast ? <ToastBanner message={toast} onDismiss={() => setToast(null)} /> : null}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{deal.title}</h1>
        <p className="text-sm text-muted capitalize">
          {deal.dealType.replace(/_/g, " ")} · Stage: {deal.stage.replace(/_/g, " ")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Terms (read-only)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted">Amount:</span> {formatKes(deal.terms.amountKes)}
          </p>
          <p>
            <span className="text-muted">Instrument:</span> {deal.terms.instrument ?? "—"}
          </p>
          <p>
            <span className="text-muted">Equity:</span>{" "}
            {deal.terms.equityPercent != null ? `${deal.terms.equityPercent}%` : "—"}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted">Notes:</span> {deal.terms.notes ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Due-diligence summary by party</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {deal.partySummaries.map((p) => (
              <li key={p.memberId} className="rounded-md border border-border p-3">
                <p className="font-medium">
                  {p.name} <span className="capitalize text-muted">({p.role})</span>
                </p>
                <p className="text-muted">
                  Verified: {p.verifiedCount} · Self-reported: {p.selfReportedCount} · Missing: {p.missingCount}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {deal.documents.map((doc) => (
          <div key={doc.id} className="space-y-3 rounded-card border border-border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{doc.fileName}</p>
                <p className="text-sm text-muted">{doc.partyName}</p>
              </div>
              <span className="rounded-full bg-[#EAF1FE] px-2 py-0.5 text-xs font-semibold text-[#0454DB]">
                {doc.adminStatus === "confirmed"
                  ? "Confirmed by FounderLink"
                  : doc.adminStatus === "rejected"
                    ? "Rejected"
                    : doc.aiPrechecked
                      ? "AI pre-checked"
                      : "Uploaded"}
              </span>
            </div>
            <DocumentViewer fileName={doc.fileName} mimeType={doc.mimeType} previewUrl={doc.previewUrl} />
            {doc.aiPrechecked ? (
              <div>
                <p className="text-sm font-medium text-foreground">AI pre-checked</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {doc.precheckFlags.map((f, i) => (
                    <li key={i} className={f.passed ? "text-[#0454DB]" : "text-[#113373] font-medium"}>
                      {f.passed ? "Passed" : "Flagged"}: {f.label} — {f.detail}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {doc.adminStatus === "uploaded" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="success" disabled={pending} onClick={() => confirmDoc(doc.id)}>
                  Confirm
                </Button>
                <Button type="button" variant="destructive" disabled={pending} onClick={() => setRejectId(doc.id)}>
                  Reject
                </Button>
              </div>
            ) : null}
            {doc.rejectionReason ? <p className="text-sm text-destructive">Reason: {doc.rejectionReason}</p> : null}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={rejectId !== null}
        title="Reject this document?"
        description="Provide a written reason. The member will see it."
        confirmLabel="Reject document"
        variant="destructive"
        loading={pending}
        onCancel={() => {
          setRejectId(null);
          setRejectReason("");
        }}
        onConfirm={rejectDoc}
      />
      {rejectId ? (
        <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md rounded-md border border-border bg-white p-4 shadow-lg">
          <Input label="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <p className="mt-2 text-xs text-muted">Confirm using the dialog above once the reason is filled (8+ characters).</p>
        </div>
      ) : null}
    </div>
  );
}
