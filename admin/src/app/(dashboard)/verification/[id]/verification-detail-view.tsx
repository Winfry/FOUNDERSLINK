"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Info, X } from "lucide-react";
import type { CheckInput, CheckMethod, CheckType, RiskLevel, VerificationDetail, VettingDecisionRecord } from "@/types";
import { verificationDecisionAction } from "@/app/actions/admin-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  CHECK_METHOD_LABEL,
  CHECK_TYPE_LABEL,
  auditActionLabel,
  checkMethodLabel,
  checkTypeLabel,
  formatDay,
  formatDayTime,
  formatKes,
  humanize,
  roleLabel,
} from "@/components/labels";
import { RISK_LABEL } from "@/components/risk-level-badge";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { ToastBanner } from "@/components/toast-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Decision = "approved" | "rejected" | "needs_info";

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

const CHECK_TYPES = Object.keys(CHECK_TYPE_LABEL) as CheckType[];
const CHECK_METHODS = Object.keys(CHECK_METHOD_LABEL) as CheckMethod[];

// What each decision is called in the confirm step and afterwards.
const DECISION_WORDS: Record<Decision, { title: string; button: string; done: string; effect: string }> = {
  approved: {
    title: "Approve",
    button: "Yes, approve",
    done: "Approved. The decision and your reason are in the audit log.",
    effect: "They will be able to connect, chat and start deals.",
  },
  needs_info: {
    title: "Ask for more information from",
    button: "Yes, ask for more",
    done: "Asked for more information. Your reason is in the audit log.",
    effect: "They will be asked to send the application again.",
  },
  rejected: {
    title: "Reject",
    button: "Yes, reject",
    done: "Rejected. The decision and your reason are in the audit log.",
    effect: "This is final: a rejected application cannot be decided again here.",
  },
};

const DECISION_BADGE: Record<string, "success" | "warning" | "destructive" | "default"> = {
  approve: "success",
  approved: "success",
  approve_first: "default",
  reinstate: "success",
  reinstated: "success",
  recheck_confirmed: "success",
  needs_info: "warning",
  reject: "destructive",
  rejected: "destructive",
  suspend: "destructive",
  suspended: "destructive",
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
const given = (value: string | null | undefined) => (value ? value : notGiven);
const list = (values: string[]) => (values.length === 0 ? notGiven : values.map((v) => humanize(v)).join(", "));

// Whether she proved the address or number is hers with a code we sent.
// Nothing is shown when the backend did not say.
function Confirmed({ at }: { at: string | null | undefined }) {
  if (at === undefined) return null;
  return at ? <Badge variant="success">Confirmed by code</Badge> : <Badge variant="warning">Not confirmed by code</Badge>;
}

function WebsiteLink({ url }: { url: string | null | undefined }) {
  if (!url) return notGiven;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  // Only a web address becomes a link. Anything else is shown as text.
  if (!/^https?:\/\/[^\s]+$/i.test(href)) return <>{url}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-link inline-flex items-center gap-1">
      {url}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

function ticketRange(min: number | null, max: number | null) {
  if (min === null && max === null) return notGiven;
  if (min !== null && max !== null) return `${formatKes(min)} to ${formatKes(max)}`;
  return min !== null ? `From ${formatKes(min)}` : `Up to ${formatKes(max)}`;
}

function outcomeOf(detail: VerificationDetail, latest: VettingDecisionRecord | undefined) {
  switch (detail.approvalStatus) {
    case "approved":
      return {
        title: "This application was approved",
        text: "The decision is final here. If something has changed, suspend the member from their page.",
      };
    case "rejected":
      return { title: "This application was rejected", text: "The decision is final. It cannot be decided again here." };
    case "suspended":
      return { title: "This member is suspended", text: "To give access back, reinstate the member from their page." };
    case "needs_info":
      return {
        title: "Waiting for the applicant",
        text: "You asked for more information. The decision form comes back when they send the application again.",
      };
    default:
      return {
        title: latest ? "Nothing to decide right now" : "Not submitted yet",
        text: "This application is not waiting for a decision.",
      };
  }
}

export function VerificationDetailView({ detail: initial }: { detail: VerificationDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [reason, setReason] = useState("");
  const [checkType, setCheckType] = useState<CheckType>("identity");
  const [checkResult, setCheckResult] = useState<"passed" | "failed">("passed");
  const [checkMethod, setCheckMethod] = useState<CheckMethod>("manual");
  const [checks, setChecks] = useState<CheckInput[]>([]);
  const [confirming, setConfirming] = useState<Decision | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  // The page's own data wins when the server sends it again.
  useEffect(() => setDetail(initial), [initial]);

  const reasonLength = reason.trim().length;
  const canAct = reasonLength >= MIN_REASON;
  const awaiting = detail.approvalStatus === "submitted" || detail.approvalStatus === "in_review";
  const latest = detail.decisions[0];
  const outcome = outcomeOf(detail, latest);

  function addCheck() {
    setChecks((c) => [...c, { checkType, result: checkResult, method: checkMethod }]);
  }

  function submit(decision: Decision) {
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof verificationDecisionAction>>;
      try {
        res = await verificationDecisionAction(detail.id, decision, reason.trim(), checks);
      } catch {
        res = { ok: false, message: "The server did not answer. Try again." };
      }
      setConfirming(null);
      if (!res.ok) {
        setToast({ text: `Your decision was not saved. ${res.message}`, error: true });
        return;
      }
      if (!res.detail) {
        setToast({ text: "Your decision was saved, but the page could not be loaded again. Reload to see it.", error: true });
        return;
      }
      setDetail(res.detail);
      setToast({
        text:
          decision === "approved" && res.detail.firstApprovalBy
            ? "Your approval is recorded. A second, different admin must give the final approval for an investor."
            : DECISION_WORDS[decision].done,
      });
      setReason("");
      setChecks([]);
      router.refresh();
    });
  }

  const signalCount = detail.riskSignals.length;
  const b = detail.business;
  const inv = detail.investor;

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
            <Link
              href={`/members/${detail.memberId}`}
              className="mt-4 inline-flex min-h-10 items-center rounded-btn border border-white/40 px-4 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-white"
            >
              Open member page
            </Link>
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

      {detail.resubmittedAfter ? (
        <div className="flex items-start gap-3 rounded-card border border-border bg-warning-light p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">Resubmitted after you asked for more information</p>
            <p className="mt-1 break-words text-sm font-medium text-foreground">
              What was asked: &ldquo;{detail.resubmittedAfter.reason}&rdquo;
            </p>
            <p className="mt-1 text-xs font-semibold text-muted">
              Asked {formatDayTime(detail.resubmittedAfter.at)}
              {detail.resubmittedAfter.by ? ` by ${detail.resubmittedAfter.by}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {detail.firstApprovalBy ? (
        <div className="flex items-start gap-3 rounded-card border border-border bg-primary-light p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">
            First approval given by {detail.firstApprovalBy}. An investor needs two: a second, different admin must give the final approval.
          </p>
        </div>
      ) : null}

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
              <Row label="Email">
                <span className="flex flex-wrap items-center gap-2">
                  {detail.email}
                  <Confirmed at={detail.emailConfirmedAt} />
                </span>
              </Row>
              <Row label="Phone">
                <span className="flex flex-wrap items-center gap-2">
                  {detail.phone ?? notGiven}
                  {detail.phone ? <Confirmed at={detail.phoneConfirmedAt} /> : null}
                </span>
              </Row>
              <Row label="Their statement">{detail.statement ?? notGiven}</Row>
              {detail.role === "expert" ? (
                <>
                  <Row label="Professional register">{detail.professionalRegister ?? notGiven}</Row>
                  <Row label="Register number">{detail.registerNumber ?? notGiven}</Row>
                </>
              ) : null}
              {/* A founder is judged on her business, so no "organisation" row for her. */}
              {detail.role !== "founder" && !inv ? (
                <>
                  <Row label="Organisation">{detail.organisationName ?? notGiven}</Row>
                  <Row label="Website">
                    <WebsiteLink url={detail.website} />
                  </Row>
                </>
              ) : null}
              <Row label="References">
                {detail.references.length === 0 ? (
                  notGiven
                ) : (
                  <ul className="space-y-1">
                    {detail.references.map((r, i) => (
                      <li key={i}>
                        {r.name}
                        {r.relationship || r.phone ? (
                          <span className="text-muted"> · {[r.relationship, r.phone].filter(Boolean).join(" · ")}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Row>
            </dl>
          </CardContent>
        </Card>
      </div>

      {detail.role === "founder" && b !== undefined ? (
        <Card>
          <CardHeader>
            <CardTitle>Their business</CardTitle>
            <CardDescription>What the founder wrote on their profile. None of it has been checked unless a check below says so.</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            {b ? (
              <dl>
                <Row label="Business name">{given(b.name)}</Row>
                <Row label="Sector">{b.sector ? humanize(b.sector) : notGiven}</Row>
                <Row label="Stage">{b.stage ? humanize(b.stage) : notGiven}</Row>
                <Row label="County">{given(b.county)}</Row>
                <Row label="Amount sought">{b.amountKes !== null ? formatKes(b.amountKes) : notGiven}</Row>
                {b.useOfFunds ? <Row label="What it is for">{b.useOfFunds}</Row> : null}
                <Row label="Description">{given(b.description)}</Row>
                <Row label="Website">
                  <WebsiteLink url={b.website ?? detail.website} />
                </Row>
              </dl>
            ) : (
              <p className="py-3 text-sm text-muted">This founder has not filled in a business profile yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {inv ? (
        <Card>
          <CardHeader>
            <CardTitle>Their organisation and what they fund</CardTitle>
            <CardDescription>What the investor wrote. None of it has been checked unless a check below says so.</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <dl>
              <Row label="Organisation">{given(inv.organisation)}</Row>
              <Row label="Role there">{given(inv.jobTitle)}</Row>
              <Row label="Website">
                <WebsiteLink url={inv.website} />
              </Row>
              {inv.claimsFunderName ? <Row label="Says they speak for">{inv.claimsFunderName}</Row> : null}
              {inv.funds ? (
                <>
                  <Row label="Sectors">{list(inv.funds.sectors)}</Row>
                  <Row label="Stages">{list(inv.funds.stages)}</Row>
                  <Row label="Ticket size">{ticketRange(inv.funds.ticketMinKes, inv.funds.ticketMaxKes)}</Row>
                  <Row label="What they fund, in their words">{given(inv.funds.mandate)}</Row>
                </>
              ) : (
                <Row label="What they fund">
                  <span className="text-muted">Not filled in yet</span>
                </Row>
              )}
              <Row label="About them">{given(inv.bio)}</Row>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {awaiting ? (
        <Card className="border-primary/30">
          <CardHeader>
            <h2 className="text-xl font-bold text-foreground">Your decision</h2>
            <CardDescription>
              Write your reason first. The three buttons turn on once the reason is at least {MIN_REASON} characters. You will be asked to
              confirm before anything is saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="decision-reason" className="text-sm font-semibold text-foreground">
                Written reason <span className="text-destructive">(required)</span>
              </label>
              <p id="decision-reason-reader" className="flex items-start gap-2 rounded-btn bg-warning-light px-3 py-2 text-sm font-semibold text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                The applicant will read this, word for word. It is also saved in the audit log with your name.
              </p>
              <textarea
                id="decision-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What you checked and why you decided this"
                className="field resize-y"
                aria-describedby="decision-reason-reader decision-reason-help"
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
                Record what you verified yourself, for example a phone call or a registry lookup. They are saved with your decision,
                exactly as you choose them here.
              </p>
              <div className="mt-3 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)_auto]">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="check-type" className="text-sm font-semibold text-foreground">
                    What you checked
                  </label>
                  <select id="check-type" className="field !w-full" value={checkType} onChange={(e) => setCheckType(e.target.value as CheckType)}>
                    {CHECK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {CHECK_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <select id="check-method" className="field !w-full" value={checkMethod} onChange={(e) => setCheckMethod(e.target.value as CheckMethod)}>
                    {CHECK_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {CHECK_METHOD_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="secondary" className="min-h-11" onClick={addCheck}>
                  Add check
                </Button>
              </div>
              {checkType === "identity" ? (
                <p className="mt-2 text-xs font-semibold text-muted">
                  Identity is checked by hand in this demo. There is no identity provider connected.
                </p>
              ) : null}
              {checks.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {checks.map((c, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-btn border border-border bg-white px-3 py-2 text-sm">
                      <span className="flex-1 font-semibold text-foreground">{CHECK_TYPE_LABEL[c.checkType]}</span>
                      <Badge variant={c.result === "passed" ? "success" : "destructive"}>{c.result === "passed" ? "Passed" : "Failed"}</Badge>
                      <span className="text-xs font-semibold text-muted">{CHECK_METHOD_LABEL[c.method]}</span>
                      <button
                        type="button"
                        onClick={() => setChecks((all) => all.filter((_, j) => j !== i))}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary-light"
                        aria-label={`Remove check: ${CHECK_TYPE_LABEL[c.checkType]}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <Button type="button" variant="primary" className="min-h-11 px-6" disabled={!canAct || pending} onClick={() => setConfirming("approved")}>
                Approve
              </Button>
              <Button type="button" variant="secondary" className="min-h-11" disabled={!canAct || pending} onClick={() => setConfirming("needs_info")}>
                Needs more info
              </Button>
              <Button type="button" variant="destructive" className="min-h-11 sm:ml-auto" disabled={!canAct || pending} onClick={() => setConfirming("rejected")}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-foreground">{outcome.title}</h2>
            <CardDescription>{outcome.text}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latest ? (
              <div className="rounded-btn bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={DECISION_BADGE[latest.decision] ?? "default"}>{auditActionLabel(latest.decision)}</Badge>
                  <span className="text-xs font-semibold text-muted">
                    {formatDayTime(latest.decidedAt)}
                    {latest.decidedBy ? ` · by ${latest.decidedBy}` : ""}
                  </span>
                </div>
                <p className="mt-2 break-words text-sm font-medium text-foreground">{latest.reason || "No reason recorded"}</p>
              </div>
            ) : null}
            <Link
              href={`/members/${detail.memberId}`}
              className="inline-flex min-h-10 items-center rounded-btn border border-border bg-white px-4 text-sm font-bold text-primary hover:border-primary hover:bg-primary-light"
            >
              Open member page
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Decision history</CardTitle>
          <CardDescription>Every decision about this member, newest first, from the audit log.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.decisions.length === 0 ? (
            <p className="text-sm text-muted">No decision has been made on this application yet. Each one will be listed here with its reason.</p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.decisions.map((d) => (
                <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={DECISION_BADGE[d.decision] ?? "default"}>{auditActionLabel(d.decision)}</Badge>
                    <span className="text-xs font-semibold text-muted">
                      {formatDayTime(d.decidedAt)}
                      {d.decidedBy ? ` · by ${d.decidedBy}` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 break-words text-sm font-medium text-foreground">{d.reason || "No reason recorded"}</p>
                  {d.checks && d.checks.length > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Checks: {d.checks.map((c) => `${checkTypeLabel(c.checkType)} (${c.result})`).join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {detail.checks.length > 0 ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground">Checks recorded</p>
              <ul className="mt-2 space-y-2">
                {detail.checks.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-foreground">{checkTypeLabel(c.checkType)}</span>
                    <Badge variant={c.result === "passed" ? "success" : "destructive"}>{c.result === "passed" ? "Passed" : "Failed"}</Badge>
                    <span className="text-xs font-semibold text-muted">
                      {checkMethodLabel(c.method)} · {formatDay(c.recordedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirming !== null}
        title={confirming ? `${DECISION_WORDS[confirming].title} ${detail.fullName}?` : ""}
        description={confirming ? DECISION_WORDS[confirming].effect : undefined}
        confirmLabel={confirming ? DECISION_WORDS[confirming].button : "Confirm"}
        variant={confirming === "rejected" ? "destructive" : "primary"}
        loading={pending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && submit(confirming)}
      >
        <div className="rounded-btn bg-surface p-3">
          <p className="text-xs font-semibold text-muted">Your reason, which the applicant will read</p>
          <p className="mt-1 max-h-40 overflow-y-auto break-words text-sm font-medium text-foreground">{reason.trim()}</p>
          {checks.length > 0 ? (
            <p className="mt-2 text-xs font-semibold text-muted">
              {checks.length === 1 ? "1 check" : `${checks.length} checks`} will be saved with it.
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
