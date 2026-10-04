"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { RiskLevel, VerificationDetail } from "@/types";
import { verificationDecisionAction } from "@/app/actions/admin-actions";
import { approvalLabel, formatDay, formatDayTime, humanize, roleLabel } from "@/components/labels";
import { RISK_LABEL } from "@/components/risk-level-badge";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { ToastBanner } from "@/components/toast-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Check = { checkType: string; result: "passed" | "failed"; method: "manual" | "provider" };

const MIN_REASON = 8;

const RISK_TEXT: Record<RiskLevel, string> = {
  low: "text-green-700",
  medium: "text-amber-700",
  high: "text-destructive",
};

const RISK_BAR: Record<RiskLevel, string> = {
  low: "bg-green-600",
  medium: "bg-amber-500",
  high: "bg-destructive",
};

const RISK_ADVICE: Record<RiskLevel, string> = {
  low: "Nothing unusual was found. Still read what they submitted.",
  medium: "Some things need a closer look before you decide.",
  high: "Read every signal below and check it yourself before you decide.",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

const notGiven = <span className="text-muted">Not given</span>;

export function VerificationDetailView({ detail: initial }: { detail: VerificationDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [reason, setReason] = useState("");
  const [checkType, setCheckType] = useState("");
  const [checkResult, setCheckResult] = useState<"passed" | "failed">("passed");
  const [checkMethod, setCheckMethod] = useState<"manual" | "provider">("manual");
  const [checks, setChecks] = useState<Check[]>([]);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const reasonLength = reason.trim().length;
  const canAct = reasonLength >= MIN_REASON;

  function addCheck() {
    if (!checkType.trim()) return;
    setChecks((c) => [...c, { checkType: checkType.trim(), result: checkResult, method: checkMethod }]);
    setCheckType("");
  }

  function submit(decision: "approved" | "rejected" | "needs_info") {
    startTransition(async () => {
      try {
        const updated = await verificationDecisionAction(detail.id, decision, reason.trim(), checks);
        if (updated) {
          setDetail(updated);
          setToast({
            text:
              decision === "approved"
                ? "Approved. The decision and your reason are in the audit log."
                : decision === "rejected"
                  ? "Rejected. The decision and your reason are in the audit log."
                  : "Marked as needs more info. Your reason is in the audit log.",
          });
          setReason("");
          setChecks([]);
          router.refresh();
        } else {
          setToast({ text: "Your decision was not saved. The application is unchanged: try again.", error: true });
        }
      } catch {
        setToast({ text: "Your decision was not saved because the server did not answer. Try again.", error: true });
      }
    });
  }

  const signalCount = detail.riskSignals.length;

  return (
    <div className="space-y-6">
      {toast ? (
        <ToastBanner message={toast.text} variant={toast.error ? "error" : "success"} onDismiss={() => setToast(null)} />
      ) : null}

      {/* The one bold thing on this page: who it is and how risky. */}
      <section className="overflow-hidden rounded-card bg-navy text-white">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-stretch md:justify-between md:p-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/70">Verification application</p>
            <h1 className="mt-1 break-words text-2xl font-extrabold leading-8">{detail.fullName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">{roleLabel(detail.role)}</span>
              <StatusBadge status={detail.approvalStatus} />
              <span className="text-xs font-semibold text-white/70">Submitted {formatDay(detail.submittedAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 overflow-hidden rounded-btn bg-white text-foreground md:w-80">
            <span className={cn("w-2 shrink-0", RISK_BAR[detail.riskLevel])} aria-hidden />
            <div className="p-4">
              <p className="text-xs font-semibold text-muted">Risk level</p>
              <p className={cn("text-[32px] font-extrabold leading-10", RISK_TEXT[detail.riskLevel])}>
                {RISK_LABEL[detail.riskLevel]}
              </p>
              <p className="mt-1 text-sm font-medium text-muted">
                {signalCount === 0 ? "No risk signals. " : signalCount === 1 ? "1 risk signal. " : `${signalCount} risk signals. `}
                {RISK_ADVICE[detail.riskLevel]}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk signals</CardTitle>
            <CardDescription>Found by FoundersLink&apos;s automatic rules. They point you to what to check; they do not decide.</CardDescription>
          </CardHeader>
          <CardContent>
            {signalCount === 0 ? (
              <div className="flex items-start gap-3 rounded-btn bg-success-light p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  The rules found nothing unusual in this application. That is not an approval: read what they submitted.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {detail.riskSignals.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 rounded-btn border border-border p-4">
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", detail.riskLevel === "high" ? "bg-destructive-light text-destructive" : "bg-warning-light text-amber-700")}>
                      <AlertTriangle className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">{s.text}</p>
                      {s.explanation ? <p className="mt-1 text-sm text-muted">{s.explanation}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What they submitted</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <dl>
              <Row label="Email">{detail.email}</Row>
              <Row label="Phone">{detail.phone ?? notGiven}</Row>
              <Row label="Organisation">{detail.organisationName ?? notGiven}</Row>
              <Row label="Website">{detail.website ?? notGiven}</Row>
              <Row label="Their statement">{detail.statement ?? notGiven}</Row>
              {detail.role === "expert" ? (
                <>
                  <Row label="Professional register">{detail.professionalRegister ?? notGiven}</Row>
                  <Row label="Register number">{detail.registerNumber ?? notGiven}</Row>
                </>
              ) : null}
              <Row label="References">
                {detail.references.length === 0 ? (
                  notGiven
                ) : (
                  <ul className="space-y-1">
                    {detail.references.map((r, i) => (
                      <li key={i}>
                        {r.name} <span className="text-muted">· {r.relationship} · {r.phone}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Row>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <h2 className="text-xl font-bold text-foreground">Your decision</h2>
          <CardDescription>
            Write your reason first. The three buttons turn on once the reason is at least {MIN_REASON} characters. It is
            saved in the audit log with your name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="decision-reason" className="text-sm font-semibold text-foreground">
              Written reason <span className="text-destructive">(required)</span>
            </label>
            <textarea
              id="decision-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What you checked and why you decided this"
              className="field resize-y"
              aria-describedby="decision-reason-help"
            />
            <p id="decision-reason-help" className={cn("text-xs font-semibold", canAct ? "text-green-700" : "text-muted")}>
              {canAct
                ? "Reason written. Choose a decision below."
                : reasonLength === 0
                  ? "The decision buttons are off until you write a reason."
                  : `${MIN_REASON - reasonLength} more ${MIN_REASON - reasonLength === 1 ? "character" : "characters"} needed.`}
            </p>
          </div>

          <div className="rounded-btn bg-surface p-4">
            <p className="text-sm font-semibold text-foreground">Checks you made (optional)</p>
            <p className="mt-0.5 text-sm text-muted">
              Record what you verified yourself, for example a phone call or a registry lookup. They are saved with your decision.
            </p>
            <div className="mt-3 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_140px_180px_auto]">
              <Input
                label="What you checked"
                value={checkType}
                onChange={(e) => setCheckType(e.target.value)}
                placeholder="e.g. Phone number"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCheck();
                  }
                }}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="check-result" className="text-sm font-semibold text-foreground">
                  Result
                </label>
                <select id="check-result" className="field !w-full" value={checkResult} onChange={(e) => setCheckResult(e.target.value as "passed" | "failed")}>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="check-method" className="text-sm font-semibold text-foreground">
                  How
                </label>
                <select id="check-method" className="field !w-full" value={checkMethod} onChange={(e) => setCheckMethod(e.target.value as "manual" | "provider")}>
                  <option value="manual">By hand</option>
                  <option value="provider">Outside provider</option>
                </select>
              </div>
              <Button type="button" variant="secondary" className="min-h-11" disabled={!checkType.trim()} onClick={addCheck}>
                Add check
              </Button>
            </div>
            {checks.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {checks.map((c, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-btn border border-border bg-white px-3 py-2 text-sm">
                    <span className="flex-1 font-semibold text-foreground">{c.checkType}</span>
                    <Badge variant={c.result === "passed" ? "success" : "destructive"}>{c.result === "passed" ? "Passed" : "Failed"}</Badge>
                    <span className="text-xs font-semibold text-muted">{c.method === "manual" ? "By hand" : "Outside provider"}</span>
                    <button
                      type="button"
                      onClick={() => setChecks((list) => list.filter((_, j) => j !== i))}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary-light"
                      aria-label={`Remove check: ${c.checkType}`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button type="button" variant="primary" className="min-h-11 px-6" disabled={!canAct || pending} onClick={() => submit("approved")}>
              Approve
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" disabled={!canAct || pending} onClick={() => submit("needs_info")}>
              Needs more info
            </Button>
            <Button type="button" variant="destructive" className="min-h-11 sm:ml-auto" disabled={!canAct || pending} onClick={() => submit("rejected")}>
              Reject
            </Button>
            {pending ? <p className="w-full text-sm font-semibold text-muted">Saving your decision…</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision history</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.decisions.length === 0 ? (
            <p className="text-sm text-muted">No decision has been made on this application yet. Each one will be listed here with its reason.</p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.decisions.map((d) => (
                <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={d.decision} />
                    <span className="text-xs font-semibold text-muted">{formatDayTime(d.decidedAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground">{d.reason || approvalLabel(d.decision)}</p>
                  {d.checks && d.checks.length > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Checks: {d.checks.map((c) => `${humanize(c.checkType)} (${c.result})`).join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
