"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavCounts } from "@/types";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";

interface SidebarProps {
  navCounts: AdminNavCounts;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ navCounts, collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("sticky top-0 flex h-screen flex-col bg-navy text-white", collapsed ? "w-16" : "w-64")}>
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/overview" className="flex items-center gap-3 rounded-btn focus-visible:outline-white" onClick={onNavigate}>
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
          </div>
          {!collapsed ? (
            <span className="leading-tight">
              <span className="block text-[17px] font-extrabold">FoundersLink</span>
              <span className="block text-xs font-semibold text-white/70">Admin</span>
            </span>
          ) : null}
        </Link>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const count = item.countKey ? navCounts[item.countKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-btn px-3 text-sm transition-colors focus-visible:outline-white",
                active ? "bg-white/10 font-bold text-white" : "font-semibold text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              {/* Orange marks where you are. */}
              {active ? <span className="absolute -left-3 top-2 h-7 w-1 rounded-r-full bg-accent" aria-hidden /> : null}
              <Icon className={cn("h-5 w-5 shrink-0", active ? "text-accent" : "text-white/80")} strokeWidth={2} aria-hidden />
              {!collapsed ? (
                <>
                  <span className="flex-1">{item.label}</span>
                  {count > 0 ? (
                    <span
                      className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-navy"
                      aria-label={item.countKey === "openReports" ? `${count} reports` : `${count} waiting`}
                    >
                      {count}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>
      {!collapsed ? (
        <p className="px-5 pb-5 text-xs font-medium leading-5 text-white/60">
          Every decision here is recorded with your written reason.
        </p>
      ) : null}
    </aside>
  );
}
