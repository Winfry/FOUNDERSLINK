"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export function ListLoading({ label = "Loading…" }: { label?: string }) {
  return <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-muted">{label}</div>;
}

// A real failure to reach the backend: says what failed and offers a retry.
export function ListError({
  what = "this page",
  message,
}: {
  /** What could not be loaded, e.g. "the verification queue". */
  what?: string;
  message?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div role="alert" className="flex flex-col items-center rounded-card border border-destructive/30 bg-destructive-light px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="text-[17px] font-bold text-foreground">We could not load {what}</h2>
      <p className="mt-1 max-w-md text-sm text-muted">
        {message ?? "The FoundersLink server did not answer. Nothing was changed. Check that it is running, then try again."}
      </p>
      <Button className="mt-5" loading={pending} onClick={() => startTransition(() => router.refresh())}>
        Try again
      </Button>
    </div>
  );
}

export function ListEmpty({ title, description }: { title: string; description?: string }) {
  return <EmptyState title={title} description={description} />;
}
