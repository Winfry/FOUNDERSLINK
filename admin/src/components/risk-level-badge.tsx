import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

// Risk is a meaning, not a brand colour: green, amber, red.
const styles: Record<RiskLevel, string> = {
  low: "bg-success-light text-green-700",
  medium: "bg-warning-light text-amber-700",
  high: "bg-destructive-light text-destructive",
};

const dot: Record<RiskLevel, string> = {
  low: "bg-green-600",
  medium: "bg-amber-500",
  high: "bg-destructive",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-4", styles[level])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[level])} aria-hidden />
      {RISK_LABEL[level]}
    </span>
  );
}
