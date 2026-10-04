"use client";

import Link from "next/link";
import type { RecheckListItem } from "@/types";

export function RechecksView({ items }: { items: RecheckListItem[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Re-checks</h1>
        <p className="text-sm text-muted">Approved members due for another verification look.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-muted">No re-checks due.</div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-[#EFF6FF]">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Last checked</th>
                <th className="px-4 py-3 font-semibold">Why due</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{row.fullName}</td>
                  <td className="px-4 py-3 capitalize">{row.role}</td>
                  <td className="px-4 py-3">{new Date(row.lastCheckedAt).toLocaleDateString("en-KE")}</td>
                  <td className="px-4 py-3 text-muted">{row.dueReason}</td>
                  <td className="px-4 py-3">
                    <Link href={`/verification/vet-${row.memberId}`} className="text-[#1D4ED8] hover:underline">
                      Open verification detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
