"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[60] !m-0 flex max-w-sm items-start gap-3 rounded-card border bg-white px-4 py-3 text-sm text-foreground shadow-card",
        variant === "success" ? "border-border" : "border-destructive/40",
      )}
      role={variant === "success" ? "status" : "alert"}
    >
      <Badge variant={variant === "success" ? "success" : "destructive"} className="shrink-0">
        {variant === "success" ? "Done" : "Not done"}
      </Badge>
      <span className="pt-0.5">{message}</span>
    </div>
  );
}
