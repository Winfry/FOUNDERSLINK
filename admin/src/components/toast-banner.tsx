"use client";

import { useEffect } from "react";
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
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-md",
        variant === "success" ? "border-[#1D4ED8]/30 bg-[#EFF6FF] text-[#1E3A8A]" : "border-destructive/30 bg-white text-destructive",
      )}
      role="status"
    >
      {message}
    </div>
  );
}
