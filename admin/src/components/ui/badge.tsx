import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "muted" | "navy";

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary-light text-primary",
  success: "bg-[#E7F3EE] text-[#28765D]",
  warning: "bg-accent-light text-[#8A6516]",
  destructive: "bg-destructive-light text-destructive",
  muted: "bg-[#F3F1F6] text-muted",
  navy: "bg-navy text-white",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-5",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
