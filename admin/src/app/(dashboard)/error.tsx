"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-card border border-border bg-white px-6 py-12 text-center shadow-card">
      <Badge variant="destructive">Something went wrong</Badge>
      <h2 className="mt-3 text-2xl font-light text-navy">This page could not be shown</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        {error.message || "The dashboard hit a problem while drawing this page."} Nothing was changed.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
