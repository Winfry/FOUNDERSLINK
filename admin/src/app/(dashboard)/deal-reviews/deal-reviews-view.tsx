"use client";

import Link from "next/link";
import type { DealReviewListItem } from "@/types";

export function DealReviewsView({ deals }: { deals: DealReviewListItem[] }) {
  if (deals.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Deal reviews</h1>
        <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-muted">
          No deals waiting for document review.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deal reviews</h1>
        <p className="text-sm text-muted">Deals at due diligence — confirm documents after AI pre-check.</p>
      </div>
      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-[#EFF6FF]">
            <tr>
              <th className="px-4 py-3 font-semibold">Deal</th>
              <th className="px-4 py-3 font-semibold">Parties</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Documents waiting</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="border-b border-border hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/deal-reviews/${d.id}`} className="font-medium text-[#1D4ED8] hover:underline">
                    {d.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{d.parties.join(", ")}</td>
                <td className="px-4 py-3 capitalize">{d.dealType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 capitalize">{d.stage.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">{d.documentsWaiting}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
