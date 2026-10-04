"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileStack } from "lucide-react";
import type { DealReviewDetail } from "@/types";
import { confirmDocumentAction, rejectDocumentAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentViewer } from "@/components/document-viewer";
import { EmptyState } from "@/components/empty-state";
import { dealTypeLabel, humanize, roleLabel, stageLabel } from "@/components/labels";
import { StatusBadge } from "@/components/status-badge";
import { ToastBanner } from "@/components/toast-banner";
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
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-base font-semibold text-foreground">{children}</dd>
    </div>
  );
}

function Count({ value, label, tone }: { value: number; label: string; tone: "good" | "plain" | "warn" }) {
  return (
    <div className="rounded-btn bg-surface px-3 py-2 text-center">
      <p className={cn("text-xl font-extrabold", tone === "good" && "text-green-700", tone === "warn" && value > 0 ? "text-amber-700" : null, tone === "plain" && "text-foreground")}>
        {value}
      </p>
      <p className="text-xs font-semibold text-muted">{label}</p>
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

      <section className="flex flex-col gap-6 rounded-card bg-navy p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/70">Deal review</p>
          <h1 className="mt-1 break-words text-2xl font-extrabold leading-8">{deal.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">{dealTypeLabel(deal.dealType)}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">Stage: {stageLabel(deal.stage)}</span>
          </div>
        </div>
        <div className="shrink-0 rounded-btn bg-white px-5 py-4 text-foreground md:w-72">
          <p className="text-[32px] font-extrabold leading-10 text-foreground">
            {waiting} <span className="text-base font-semibold text-muted">of {deal.documents.length}</span>
          </p>
          <p className="text-sm font-medium text-muted">
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
                <dt className="text-xs font-semibold text-muted">Notes</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{deal.terms.notes ?? <span className="text-muted">No notes</span>}</dd>
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
                    <p className="text-sm font-semibold text-foreground">
                      {p.name} <span className="font-medium text-muted">· {roleLabel(p.role)}</span>
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
        <h2 className="text-xl font-bold text-foreground">Documents</h2>
        <p className="mt-1 text-sm text-muted">
          Open each document, read it, then confirm or reject it. Rejecting needs a written reason.
        </p>
      </div>

      {deal.documents.length === 0 ? (
        <EmptyState
          icon={FileStack}
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
                    <p className="break-words text-[17px] font-bold text-foreground">{doc.fileName}</p>
                    <p className="text-sm text-muted">Shared by {doc.partyName}</p>
                  </div>
                  <StatusBadge status={doc.adminStatus} />
                </div>

                <DocumentViewer fileName={doc.fileName} mimeType={doc.mimeType} previewUrl={doc.previewUrl} />

                {doc.aiPrechecked ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground">Automatic pre-check</p>
                    <p className="text-xs font-semibold text-muted">A first pass to guide you. It is not a decision.</p>
                    {doc.precheckFlags.length === 0 ? (
                      <p className="mt-2 text-sm text-muted">The pre-check raised nothing on this document.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {doc.precheckFlags.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            {f.passed ? (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                            )}
                            <span className="font-medium text-foreground">
                              <span className="font-semibold">{f.passed ? "Passed" : "Flagged"}: {humanize(f.label)}</span>
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
                  <p className="rounded-btn bg-destructive-light px-4 py-3 text-sm font-medium text-foreground">
                    <span className="font-semibold text-destructive">Rejected because:</span> {doc.rejectionReason}
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
          <label htmlFor="reject-reason" className="text-sm font-semibold text-foreground">
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
          <p className="text-xs font-semibold text-muted">
            {reasonLength >= MIN_REASON
              ? "Reason written."
              : `Write at least ${MIN_REASON} characters to turn on the Reject button.`}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
