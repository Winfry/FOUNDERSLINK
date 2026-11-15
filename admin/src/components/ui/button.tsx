import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "success" | "outline";

// Purple is what you can press: a solid pill for the main action, a
// purple outline for the second choice. Gold is never a button here.
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  // Kept as a name for older call sites: a positive action is the primary purple.
  success: "bg-primary text-white hover:bg-primary-dark",
  secondary: "border border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary-light",
  outline: "border border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary-light",
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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-primary-light disabled:text-muted",
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
