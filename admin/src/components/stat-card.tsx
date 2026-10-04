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
    <div className={cn("flex min-w-0 items-center gap-4 rounded-card border border-border bg-white p-5 transition-colors", className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-primary-light text-primary">
        <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-extrabold leading-8 text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted">{title}</p>
      </div>
    </div>
  );
}
