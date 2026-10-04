"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { VerificationDetail } from "@/types";
import { verificationDecisionAction } from "@/app/actions/admin-actions";
import { RiskLevelBadge } from "@/components/risk-level-badge";
import { ToastBanner } from "@/components/toast-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VerificationDetailView({ detail: initial }: { detail: VerificationDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [reason, setReason] = useState("");
  const [checkType, setCheckType] = useState("Phone number");
  const [checkResult, setCheckResult] = useState<"passed" | "failed">("passed");
  const [checkMethod, setCheckMethod] = useState<"manual" | "provider">("manual");
  const [checks, setChecks] = useState<{ checkType: string; result: "passed" | "failed"; method: "manual" | "provider" }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canAct = reason.trim().length >= 8;

  function addCheck() {
    if (!checkType.trim()) return;
    setChecks((c) => [...c, { checkType: checkType.trim(), result: checkResult, method: checkMethod }]);
    setCheckType("");
  }

  function submit(decision: "approved" | "rejected" | "needs_info") {
    startTransition(async () => {
      const updated = await verificationDecisionAction(detail.id, decision, reason.trim(), checks);
      if (updated) {
        setDetail(updated);
        setToast(
          decision === "approved"
            ? "Verification approved."
            : decision === "rejected"
              ? "Verification rejected."
              : "Marked as needs more info.",
        );
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {toast ? <ToastBanner message={toast} onDismiss={() => setToast(null)} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{detail.fullName}</h1>
          <p className="text-sm text-muted capitalize">
            {detail.role} · {detail.approvalStatus.replace(/_/g, " ")}
          </p>
        </div>
        <RiskLevelBadge level={detail.riskLevel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submitted details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted">Email:</span> {detail.email}
            </p>
            <p>
              <span className="text-muted">Phone:</span> {detail.phone ?? "—"}
            </p>
            <p>
              <span className="text-muted">Statement:</span> {detail.statement ?? "—"}
            </p>
            <p>
              <span className="text-muted">Organisation:</span> {detail.organisationName ?? "—"}
            </p>
            <p>
              <span className="text-muted">Website:</span> {detail.website ?? "—"}
            </p>
            {detail.role === "expert" ? (
              <>
                <p>
                  <span className="text-muted">Professional register:</span> {detail.professionalRegister ?? "—"}
                </p>
                <p>
                  <span className="text-muted">Register number:</span> {detail.registerNumber ?? "—"}
                </p>
              </>
            ) : null}
            {detail.references.length > 0 ? (
              <div>
                <p className="font-medium text-foreground">References</p>
                <ul className="mt-1 list-disc pl-5">
                  {detail.references.map((r, i) => (
                    <li key={i}>
                      {r.name} ({r.relationship}) — {r.phone}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk signals</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.riskSignals.length === 0 ? (
              <p className="text-sm text-muted">No risk signals — AI pre-checked profile looks consistent.</p>
            ) : (
              <ul className="space-y-3">
                {detail.riskSignals.map((s) => (
                  <li key={s.id} className="rounded-md border border-border bg-[#EAF1FE] p-3 text-sm">
                    <p className="font-medium text-[#113373]">{s.text}</p>
                    <p className="mt-1 text-muted">{s.explanation}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checks made</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input label="Check type" value={checkType} onChange={(e) => setCheckType(e.target.value)} className="min-w-[160px] flex-1" />
            <select
              className="min-h-11 rounded-md border border-border px-3 text-sm"
              value={checkResult}
              onChange={(e) => setCheckResult(e.target.value as "passed" | "failed")}
              aria-label="Check result"
            >
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
            <select
              className="min-h-11 rounded-md border border-border px-3 text-sm"
              value={checkMethod}
              onChange={(e) => setCheckMethod(e.target.value as "manual" | "provider")}
              aria-label="Check method"
            >
              <option value="manual">Manual</option>
              <option value="provider">Provider</option>
            </select>
            <Button type="button" variant="secondary" onClick={addCheck}>
              Add check
            </Button>
          </div>
          {checks.length > 0 ? (
            <ul className="text-sm">
              {checks.map((c, i) => (
                <li key={i}>
                  {c.checkType} — {c.result} ({c.method})
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Written reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what you checked and why"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" disabled={!canAct || pending} loading={pending} onClick={() => submit("needs_info")}>
              Needs more info
            </Button>
            <Button type="button" variant="destructive" disabled={!canAct || pending} loading={pending} onClick={() => submit("rejected")}>
              Reject
            </Button>
            <Button type="button" variant="success" disabled={!canAct || pending} loading={pending} onClick={() => submit("approved")}>
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision history</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.decisions.length === 0 ? (
            <p className="text-sm text-muted">No decisions yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {detail.decisions.map((d) => (
                <li key={d.id} className="border-b border-border pb-2">
                  <p className="font-medium capitalize">
                    {d.decision.replace(/_/g, " ")} · {new Date(d.decidedAt).toLocaleString("en-KE")}
                  </p>
                  <p className="text-muted">{d.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
