"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-card border border-destructive/30 bg-destructive-light p-6">
      <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
      <p className="mt-2 text-sm text-foreground">{error.message || "An unexpected error occurred."}</p>
      <Button className="mt-4" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
