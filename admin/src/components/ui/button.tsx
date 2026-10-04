import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "success" | "outline";

// Blue is what you can press. Orange is never a button.
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  // Kept as a name for older call sites: a positive action is the primary blue.
  success: "bg-primary text-white hover:bg-primary-dark",
  secondary: "border border-border bg-white text-primary hover:border-primary hover:bg-primary-light",
  outline: "border border-border bg-white text-primary hover:border-primary hover:bg-primary-light",
  ghost: "bg-transparent text-primary hover:bg-primary-light",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-btn px-4 py-2 text-sm font-bold transition-colors",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-100 disabled:text-slate-400",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
