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
        "rounded-card border border-border bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} aria-hidden />
      </div>
      <p className="text-xs font-medium text-muted sm:text-sm">{title}</p>
      <p className="mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl">{value}</p>
    </div>
  );
}
