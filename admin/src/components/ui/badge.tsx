import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "muted" | "navy";

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary-light text-primary",
  success: "bg-success-light text-green-700",
  warning: "bg-warning-light text-amber-700",
  destructive: "bg-destructive-light text-destructive",
  muted: "bg-slate-100 text-slate-600",
  navy: "bg-navy text-white",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-4",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
