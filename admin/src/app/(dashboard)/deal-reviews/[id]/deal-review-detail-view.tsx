"use client";

import { useState, useTransition } from "react";
import type { DealReviewDetail } from "@/types";
import { confirmDocumentAction, rejectDocumentAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentViewer } from "@/components/document-viewer";
import { EmptyState } from "@/components/empty-state";
import { dealTypeLabel, humanize, roleLabel, stageLabel } from "@/components/labels";
import { StatusBadge } from "@/components/status-badge";
import { ToastBanner } from "@/components/toast-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MIN_REASON = 8;

function formatKes(amount: number | null) {
  if (amount == null) return null;
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

const notSet = <span className="text-muted">Not set</span>;

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-base text-navy">{children}</dd>
    </div>
  );
}

function Count({ value, label, tone }: { value: number; label: string; tone: "good" | "plain" | "warn" }) {
  return (
    <div className="rounded-btn bg-background px-3 py-2.5 text-center">
      <p
        className={cn(
          "text-2xl font-light",
          tone === "good" && "text-[#28765D]",
          tone === "warn" && (value > 0 ? "text-[#8A6516]" : "text-navy"),
          tone === "plain" && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function DealReviewDetailView({ deal: initial }: { deal: DealReviewDetail }) {
  const [deal, setDeal] = useState(initial);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const waiting = deal.documents.filter((d) => d.adminStatus === "uploaded").length;
  const reasonLength = rejectReason.trim().length;
  const nameOf = (id: string | null) => deal.documents.find((d) => d.id === id)?.fileName ?? "this document";

  function confirmDoc() {
    const documentId = confirmId;
    if (!documentId) return;
    startTransition(async () => {
      try {
        await confirmDocumentAction(deal.id, documentId);
        setDeal((d) => ({
          ...d,
          documents: d.documents.map((doc) => (doc.id === documentId ? { ...doc, adminStatus: "confirmed" as const } : doc)),
        }));
        setToast({ text: "Document confirmed. It now shows as Confirmed by FoundersLink." });
      } catch {
        setToast({ text: "The document was not confirmed: the server did not accept it. Try again.", error: true });
      }
      setConfirmId(null);
    });
  }

  function rejectDoc() {
    const documentId = rejectId;
    if (!documentId || reasonLength < MIN_REASON) return;
    startTransition(async () => {
      try {
        await rejectDocumentAction(deal.id, documentId, rejectReason.trim());
        setDeal((d) => ({
          ...d,
          documents: d.documents.map((doc) =>
            doc.id === documentId ? { ...doc, adminStatus: "rejected" as const, rejectionReason: rejectReason.trim() } : doc,
          ),
        }));
        setToast({ text: "Document rejected. Your reason was saved." });
      } catch {
        setToast({ text: "The document was not rejected: the server did not accept it. Try again.", error: true });
      }
      setRejectId(null);
      setRejectReason("");
    });
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <ToastBanner message={toast.text} variant={toast.error ? "error" : "success"} onDismiss={() => setToast(null)} />
      ) : null}

      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">Deal review</p>
          <h1 className="mt-1 break-words text-[34px] font-light leading-[40px] text-navy md:text-[40px] md:leading-[44px]">{deal.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="default">{dealTypeLabel(deal.dealType)}</Badge>
            <Badge variant="muted">Stage: {stageLabel(deal.stage)}</Badge>
          </div>
        </div>
        <div className="shrink-0 rounded-card border border-border bg-white px-5 py-[18px] shadow-card md:w-72">
          <p className="text-xs text-muted">Waiting for you</p>
          <p className="mt-2.5 text-[34px] font-normal leading-9 tracking-tight text-primary">
            {waiting} <span className="text-[17px] text-[#9A93A5]">of {deal.documents.length}</span>
          </p>
          <p className="mt-2 text-[13px] text-muted">
            {waiting === 0
              ? "No documents are waiting for you in this deal."
              : waiting === 1
                ? "document is waiting for your decision."
                : "documents are waiting for your decision."}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Terms the parties set</CardTitle>
            <CardDescription>For reference only. FoundersLink does not hold or move any of this money.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Term label="Amount">{formatKes(deal.terms.amountKes) ?? notSet}</Term>
              <Term label="Instrument">{deal.terms.instrument ? humanize(deal.terms.instrument) : notSet}</Term>
              <Term label="Equity">{deal.terms.equityPercent != null ? `${deal.terms.equityPercent}%` : notSet}</Term>
              <div className="sm:col-span-3">
                <dt className="text-xs text-muted">Notes</dt>
                <dd className="mt-1 text-sm text-foreground">{deal.terms.notes ?? <span className="text-muted">No notes</span>}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Due diligence by party</CardTitle>
            <CardDescription>How much of each party&apos;s checklist is backed by a confirmed document.</CardDescription>
          </CardHeader>
          <CardContent>
            {deal.partySummaries.length === 0 ? (
              <p className="text-sm text-muted">No parties are listed on this deal.</p>
            ) : (
              <ul className="space-y-4">
                {deal.partySummaries.map((p) => (
                  <li key={p.memberId}>
                    <p className="text-sm font-medium text-navy">
                      {p.name} <span className="font-normal text-muted">· {roleLabel(p.role)}</span>
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Count value={p.verifiedCount} label="Confirmed" tone="good" />
                      <Count value={p.selfReportedCount} label="Self-reported" tone="plain" />
                      <Count value={p.missingCount} label="Missing" tone="warn" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-light text-navy">Documents</h2>
        <p className="mt-1 text-sm text-muted">
          Open each document, read it, then confirm or reject it. Rejecting needs a written reason.
        </p>
      </div>

      {deal.documents.length === 0 ? (
        <EmptyState
          title="No documents have been shared in this deal"
          description="Documents the founder or investor uploads for due diligence will appear here for you to confirm or reject."
        />
      ) : (
        <div className="space-y-4">
          {deal.documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-[17px] font-medium text-navy">{doc.fileName}</p>
                    <p className="text-sm text-muted">Shared by {doc.partyName}</p>
                  </div>
                  <StatusBadge status={doc.adminStatus} />
                </div>

                <DocumentViewer fileName={doc.fileName} mimeType={doc.mimeType} previewUrl={doc.previewUrl} />

                {doc.aiPrechecked ? (
                  <div>
                    <p className="text-sm font-medium text-navy">Automatic pre-check</p>
                    <p className="text-xs text-muted">A first pass to guide you. It is not a decision.</p>
                    {doc.precheckFlags.length === 0 ? (
                      <p className="mt-2 text-sm text-muted">The pre-check raised nothing on this document.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {doc.precheckFlags.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Badge variant={f.passed ? "success" : "warning"} className="shrink-0">
                              {f.passed ? "Passed" : "Needs attention"}
                            </Badge>
                            <span className="pt-0.5 text-foreground">
                              <span className="font-medium text-navy">{humanize(f.label)}</span>
                              {f.detail ? <span className="text-muted"> · {f.detail}</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No automatic pre-check was run on this document. Review it by hand.</p>
                )}

                {doc.rejectionReason ? (
                  <p className="rounded-btn bg-destructive-light px-4 py-3 text-sm text-foreground">
                    <span className="font-medium text-destructive">Rejected because:</span> {doc.rejectionReason}
                  </p>
                ) : null}

                {doc.adminStatus === "uploaded" ? (
                  <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                    <Button type="button" variant="primary" className="min-h-11 px-6" disabled={pending} onClick={() => setConfirmId(doc.id)}>
                      Confirm document
                    </Button>
                    <Button type="button" variant="destructive" className="min-h-11" disabled={pending} onClick={() => setRejectId(doc.id)}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Confirm this document?"
        description={`“${nameOf(confirmId)}” will be marked as Confirmed by FoundersLink. Only confirm a document you have opened and read.`}
        confirmLabel="Confirm document"
        loading={pending}
        onCancel={() => setConfirmId(null)}
        onConfirm={confirmDoc}
      />

      <ConfirmDialog
        open={rejectId !== null}
        title="Reject this document?"
        description={`“${nameOf(rejectId)}” will be marked as rejected. The member will see your reason.`}
        confirmLabel="Reject document"
        variant="destructive"
        loading={pending}
        confirmDisabled={reasonLength < MIN_REASON}
        onCancel={() => {
          setRejectId(null);
          setRejectReason("");
        }}
        onConfirm={rejectDoc}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reject-reason" className="text-sm font-medium text-navy">
            Reason for rejecting <span className="text-destructive">(required)</span>
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="What is wrong with the document and what they should send instead"
            className="field resize-y"
          />
          <p className="text-xs text-muted">
            {reasonLength >= MIN_REASON
              ? "Reason written."
              : `Write at least ${MIN_REASON} characters to turn on the Reject button.`}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
