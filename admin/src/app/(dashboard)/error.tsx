"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-card border border-destructive/30 bg-destructive-light px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="text-[17px] font-bold text-foreground">This page could not be shown</h2>
      <p className="mt-1 max-w-md text-sm text-muted">
        {error.message || "The dashboard hit a problem while drawing this page."} Nothing was changed.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
