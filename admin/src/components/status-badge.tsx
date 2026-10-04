import { Badge } from "@/components/ui/badge";
import { humanize } from "@/components/labels";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const STATUS_MAP: Record<string, { label: string; variant: Variant }> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "destructive" },
  draft: { label: "Not submitted", variant: "muted" },
  submitted: { label: "Waiting for review", variant: "default" },
  in_review: { label: "In review", variant: "default" },
  under_review: { label: "In review", variant: "default" },
  needs_info: { label: "Needs more info", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  reinstated: { label: "Reinstated", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  verified: { label: "Verified", variant: "success" },
  confirmed: { label: "Confirmed by FoundersLink", variant: "success" },
  uploaded: { label: "Waiting for review", variant: "default" },
  open: { label: "Open", variant: "warning" },
  handled: { label: "Handled", variant: "success" },
  current: { label: "Current", variant: "success" },
  due: { label: "Review due", variant: "warning" },
  out_of_date: { label: "Out of date", variant: "destructive" },
  closed: { label: "Closed", variant: "muted" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: humanize(status), variant: "muted" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
