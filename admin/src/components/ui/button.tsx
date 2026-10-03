import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark disabled:opacity-50",
  secondary:
    "bg-white text-foreground border border-border hover:bg-primary-light disabled:opacity-50",
  ghost: "bg-transparent text-primary hover:bg-primary-light",
  destructive: "bg-destructive text-white hover:opacity-90",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  loading,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-card px-4 py-2 text-sm font-semibold transition-colors",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
