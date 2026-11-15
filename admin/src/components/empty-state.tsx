import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Accepted and ignored: the design says it in words. */
  icon?: unknown;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// A normal "nothing here yet": calm, says what will appear, never red.
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-card border border-border bg-white px-6 py-12 text-center shadow-card", className)}>
      <h2 className="text-2xl font-light text-navy">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
