"use client";

import { Info, Scale } from "lucide-react";
import type { ComplianceSourceRow } from "@/types";
import { EmptyState } from "@/components/empty-state";
import { formatDay } from "@/components/labels";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";

const SCOPE: Record<string, string> = { business: "Business requirement", deal: "Deal requirement" };

// "business · Kenya Revenue Authority" arrives with the scope as a raw word.
function coversText(covers: string) {
  return covers
    .split(" · ")
    .map((part, i) => (i === 0 ? SCOPE[part] ?? part : part))
    .join(" · ");
}

export function ComplianceSourcesView({ sources }: { sources: ComplianceSourceRow[] }) {
  const attention = sources.filter((s) => s.status !== "current").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance sources"
        description="The official sources that Ask Compliance answers from, and how recently each one was checked. Those needing attention are first."
      />
      <div className="flex items-start gap-3 rounded-btn bg-primary-light px-4 py-3 text-sm font-medium text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p>
          This page is read-only for now. Marking a source as reviewed from the dashboard is not available yet.
          {sources.length > 0
            ? attention === 0
              ? " Every source is current."
              : ` ${attention} of ${sources.length} ${sources.length === 1 ? "source needs" : "sources need"} attention.`
            : ""}
        </p>
      </div>
      {sources.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No compliance sources are listed"
          description="Each official source that Ask Compliance relies on will be listed here with the date it was last checked."
        />
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold text-foreground">{s.name}</p>
                    {s.covers ? <p className="text-sm text-muted">{coversText(s.covers)}</p> : null}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                {s.reviewNote ? <p className="mt-3 text-sm font-medium text-foreground">{s.reviewNote}</p> : null}
                <p className="mt-3 text-xs font-semibold text-muted">
                  {s.lastUpdatedAt ? `Last checked ${formatDay(s.lastUpdatedAt)}` : "Never checked against the official source"}
                  {s.lastReviewedAt ? ` · Last reviewed ${formatDay(s.lastReviewedAt)}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
