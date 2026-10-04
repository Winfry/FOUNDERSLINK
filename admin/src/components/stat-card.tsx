import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-card border border-border bg-white p-3 shadow-sm sm:gap-3.5 sm:p-4",
        className,
      )}
    >
      <div className="ml-0.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
        <Icon className="h-3 w-3 text-white" strokeWidth={2.5} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-snug text-muted sm:text-sm">{title}</p>
        <p className="mt-0.5 break-words text-base font-bold leading-snug text-foreground sm:text-lg">
          {value}
        </p>
      </div>
    </div>
  );
}
