"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AdminSession } from "@/lib/auth/session";

interface TopbarProps {
  session: AdminSession;
  onMenuClick?: () => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Topbar({ session, onMenuClick }: TopbarProps) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-white px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button type="button" variant="secondary" className="px-3 lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">Menu</span>
        </Button>
        <span className="text-[17px] font-extrabold text-foreground lg:hidden">FoundersLink</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-navy" aria-hidden>
          {initials(session.name)}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-5 text-foreground">{session.name}</p>
          <p className="text-xs font-semibold leading-4 text-muted">Signed in as admin</p>
        </div>
        <Button type="button" variant="secondary" className="ml-2" onClick={logout}>
          <LogOut className="h-4 w-4" aria-hidden />
          Log out
        </Button>
      </div>
    </header>
  );
}
