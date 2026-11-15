import type { RiskLevel } from "@/types";
import { Badge } from "@/components/ui/badge";

// Risk is a meaning, said as a word: low, medium, high.
const variant: Record<RiskLevel, "success" | "warning" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  return <Badge variant={variant[level]}>{RISK_LABEL[level]}</Badge>;
}
