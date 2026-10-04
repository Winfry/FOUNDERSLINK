import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

const styles: Record<RiskLevel, string> = {
  low: "bg-[#EFF6FF] text-[#1D4ED8]",
  medium: "bg-[#DBEAFE] text-[#1E3A8A]",
  high: "bg-[#1E3A8A] text-white",
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", styles[level])}>
      {label}
    </span>
  );
}
