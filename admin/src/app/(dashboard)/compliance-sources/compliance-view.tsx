"use client";

import { useState, useTransition } from "react";
import type { ComplianceSourceRow } from "@/types";
import { complianceReviewAction } from "@/app/actions/admin-actions";
import { ToastBanner } from "@/components/toast-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const statusStyle: Record<ComplianceSourceRow["status"], string> = {
  current: "bg-[#EFF6FF] text-[#1D4ED8]",
  due: "bg-[#DBEAFE] text-[#1E3A8A]",
  out_of_date: "bg-[#1E3A8A] text-white",
};

export function ComplianceSourcesView({ sources: initial }: { sources: ComplianceSourceRow[] }) {
  const [sources, setSources] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitReview(id: string) {
    if (note.trim().length < 4) return;
    startTransition(async () => {
      const updated = await complianceReviewAction(id, note.trim());
      if (updated) {
        setSources((list) => list.map((s) => (s.id === id ? updated : s)));
        setToast("Source marked as reviewed.");
        setActiveId(null);
        setNote("");
      } else {
        setToast("Review not saved: the backend cannot record this yet.");
        setActiveId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {toast ? <ToastBanner message={toast} onDismiss={() => setToast(null)} /> : null}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compliance sources</h1>
        <p className="text-sm text-muted">Freshness report for official sources Ask Compliance relies on.</p>
      </div>
      {sources.length === 0 ? (
        <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-muted">No sources listed.</div>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <div key={s.id} className="rounded-card border border-border bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-muted">{s.covers}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", statusStyle[s.status])}>
                  {s.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Last updated: {s.lastUpdatedAt ? new Date(s.lastUpdatedAt).toLocaleDateString("en-KE") : "never"}
                {s.lastReviewedAt ? ` · Last reviewed: ${new Date(s.lastReviewedAt).toLocaleDateString("en-KE")}` : ""}
              </p>
              {s.reviewNote ? <p className="mt-1 text-muted">Note: {s.reviewNote}</p> : null}
              {activeId === s.id ? (
                <div className="mt-3 space-y-2">
                  <Input label="Review note" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex gap-2">
                    <Button type="button" loading={pending} disabled={note.trim().length < 4} onClick={() => submitReview(s.id)}>
                      Mark as reviewed
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setActiveId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="secondary" className="mt-3" onClick={() => setActiveId(s.id)}>
                  Mark as reviewed
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
