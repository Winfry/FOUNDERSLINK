import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "muted";

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary-light text-primary",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  destructive: "bg-destructive-light text-destructive",
  muted: "bg-slate-100 text-muted",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
