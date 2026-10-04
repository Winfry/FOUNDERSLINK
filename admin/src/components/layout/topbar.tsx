"use client";

import { Menu } from "lucide-react";
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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center">
        <Button
          type="button"
          variant="ghost"
          className="min-h-9 px-2 text-foreground lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">{session.name}</p>
          <p className="text-xs text-muted">Admin</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0454DB] text-xs font-bold text-white">
          {initials(session.name)}
        </div>
        <Button type="button" variant="outline" className="min-h-9" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
