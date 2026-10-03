import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "muted" }> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "destructive" },
  pending_kyc: { label: "Pending KYC", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  under_review: { label: "Under review", variant: "default" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  verified: { label: "Verified", variant: "success" },
  pending_verification: { label: "Pending verification", variant: "warning" },
  processing: { label: "Processing", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  closed: { label: "Closed", variant: "muted" },
  forming: { label: "Forming", variant: "default" },
  disabled: { label: "Disabled", variant: "muted" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status.replace(/_/g, " "), variant: "muted" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
