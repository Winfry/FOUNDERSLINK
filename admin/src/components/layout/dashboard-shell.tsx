"use client";

import * as React from "react";
import type { AdminNavCounts } from "@/types";
import type { AdminSession } from "@/lib/auth/session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({
  session,
  navCounts,
  children,
}: {
  session: AdminSession;
  navCounts: AdminNavCounts;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar navCounts={navCounts} session={session} />
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-navy/50" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full w-[252px] shadow-xl">
            <Sidebar navCounts={navCounts} session={session} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 bg-background px-4 py-6 md:px-10 md:py-9">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
