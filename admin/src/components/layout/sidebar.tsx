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
    <aside
      className={cn(
        "flex h-full min-h-screen flex-col bg-[#1D4ED8] text-white",
        collapsed ? "w-16" : "w-56 md:w-64",
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-white/15 px-4">
        <Link href="/overview" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-sm font-bold text-[#1D4ED8]">
            FL
          </div>
          {!collapsed ? <span className="font-bold tracking-tight">FounderLink</span> : null}
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const count = item.countKey ? navCounts[item.countKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/90 transition-colors",
                active ? "bg-[#1E3A8A] text-white" : "hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-white" strokeWidth={2} aria-hidden />
              {!collapsed ? (
                <>
                  <span className="flex-1">{item.label}</span>
                  {count > 0 ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#1D4ED8]">
                      {count}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
