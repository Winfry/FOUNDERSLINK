"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { AdminRole } from "@/types";
import { cn } from "@/lib/utils";
import { navForRole } from "./nav-config";

interface SidebarProps {
  role: AdminRole;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ role, collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navForRole(role);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-screen flex-col bg-primary text-white",
        collapsed ? "w-16" : "w-56 md:w-64",
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-white/15 px-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex h-9 w-9 items-center justify-center rounded-card bg-white text-sm font-bold text-primary">
            FL
          </div>
          {!collapsed ? <span className="font-bold tracking-tight">FounderLink</span> : null}
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-card px-3 text-sm font-medium text-white/90 transition-colors",
                active ? "bg-white/15 text-white" : "hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-white" strokeWidth={2} aria-hidden />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/15 p-2">
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 w-full items-center gap-3 rounded-card px-3 text-sm font-medium text-white/90 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4 shrink-0 text-white" aria-hidden />
          {!collapsed ? <span>Sign out</span> : null}
        </button>
      </div>
    </aside>
  );
}
