import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

const styles: Record<RiskLevel, string> = {
  low: "bg-[#EAF1FE] text-[#0454DB]",
  medium: "bg-[#DBEAFE] text-[#113373]",
  high: "bg-[#113373] text-white",
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", styles[level])}>
      {label}
    </span>
  );
}
