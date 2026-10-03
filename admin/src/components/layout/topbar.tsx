"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
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
      <Link
        href="/profile"
        className="flex shrink-0 flex-col items-center gap-0.5 rounded-card px-2 py-1 hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {initials(session.name)}
        </div>
        <span className="max-w-[120px] truncate text-[10px] font-medium text-foreground sm:max-w-none sm:text-xs">
          {session.name}
        </span>
      </Link>
    </header>
  );
}
