"use client";

import { useEffect } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastBanner({
  message,
  onDismiss,
  variant = "success",
}: {
  message: string;
  onDismiss: () => void;
  variant?: "success" | "error";
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const Icon = variant === "success" ? CheckCircle2 : CircleAlert;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[60] !m-0 flex max-w-sm items-start gap-3 rounded-btn border bg-white px-4 py-3 text-sm font-semibold shadow-lg",
        variant === "success" ? "border-primary/30 text-foreground" : "border-destructive/40 text-destructive",
      )}
      role={variant === "success" ? "status" : "alert"}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", variant === "success" ? "text-primary" : "text-destructive")} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
