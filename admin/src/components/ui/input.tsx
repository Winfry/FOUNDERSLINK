import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Shown inside the field on the right, e.g. a Show/Hide button. */
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, trailing, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "field",
              trailing && "pr-20",
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              className,
            )}
            {...props}
          />
          {trailing ? <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div> : null}
        </div>
        {hint && !error ? <p className="text-xs font-medium text-muted">{hint}</p> : null}
        {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";
