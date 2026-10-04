import { EmptyState } from "@/components/empty-state";

export function ListLoading({ label = "Loading…" }: { label?: string }) {
  return <div className="rounded-card border border-border bg-white p-8 text-center text-sm text-muted">{label}</div>;
}

export function ListError({ message = "Something went wrong. Try again." }: { message?: string }) {
  return (
    <div className="rounded-card border border-destructive/30 bg-white p-8 text-center text-sm text-destructive">
      {message}
    </div>
  );
}

export function ListEmpty({ title, description }: { title: string; description?: string }) {
  return <EmptyState title={title} description={description} />;
}
