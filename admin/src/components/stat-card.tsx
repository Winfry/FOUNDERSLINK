import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  /** Accepted and ignored: the design shows numbers without icons. */
  icon?: unknown;
  className?: string;
  /** A short line under the number, e.g. what it leaves out. */
  note?: string;
}

/** A number that matters: its name, the number in large light purple, and a short note. */
export function StatCard({ title, value, className, note }: StatCardProps) {
  return (
    <div className={cn("min-w-0 rounded-card border border-border bg-white px-5 py-[18px] shadow-card", className)}>
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-2.5 text-[34px] font-normal leading-9 tracking-tight text-primary">{value}</p>
      {note ? <p className="mt-2 text-[13px] text-muted">{note}</p> : null}
    </div>
  );
}
