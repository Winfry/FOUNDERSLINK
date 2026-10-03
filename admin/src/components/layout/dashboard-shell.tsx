"use client";

import * as React from "react";
import type { AdminSession } from "@/lib/auth/session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden shrink-0 lg:block">
        <Sidebar role={session.role} />
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-64 shadow-lg">
            <Sidebar role={session.role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar session={session} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 bg-[#FAFAFA] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
