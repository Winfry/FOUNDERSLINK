import type { ComplianceSourceRow, ComplianceSourceStatus } from "@/types";
import { backend } from "@/lib/api";

interface ApiSource {
  id: string;
  title: string;
  scope: string;
  institution: string | null;
  owner: string | null;
  source_url: string | null;
  last_verified_at: string | null;
  next_review_at: string | null;
  finance_act_year: number | null;
  is_demo: boolean;
  flags: ("no_source" | "never_verified" | "review_due" | "no_owner")[];
}

const FLAG_TEXT: Record<string, string> = {
  no_source: "no official source link",
  never_verified: "never verified",
  review_due: "review is due",
  no_owner: "nobody owns it",
};

// Never verified is the furthest from current the page can show.
function statusOf(s: ApiSource): ComplianceSourceStatus {
  if (s.flags.includes("never_verified")) return "out_of_date";
  if (s.flags.includes("review_due")) return "due";
  return "current";
}

function toRow(s: ApiSource): ComplianceSourceRow {
  const notes = [
    s.flags.length ? `Needs attention: ${s.flags.map((f) => FLAG_TEXT[f] ?? f).join(", ")}` : null,
    s.is_demo ? "Demo content, not checked against the official source" : null,
  ].filter(Boolean);
  return {
    id: s.id,
    name: s.title,
    covers: [s.scope, s.institution].filter(Boolean).join(" · "),
    // Empty when the item has never been verified.
    lastUpdatedAt: s.last_verified_at ?? "",
    status: statusOf(s),
    // The backend keeps one date, the last verification, and no note.
    lastReviewedAt: null,
    reviewNote: notes.length ? notes.join(". ") : null,
  };
}

// Already sorted by the backend: the ones needing attention first.
export async function fetchComplianceSources(): Promise<ComplianceSourceRow[]> {
  const report = await backend<{ items: ApiSource[] }>("GET", "/admin/compliance/sources");
  return report.items.map(toRow);
}
