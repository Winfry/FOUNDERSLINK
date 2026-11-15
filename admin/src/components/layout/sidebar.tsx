"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AdminNavCounts } from "@/types";
import type { AdminSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav-config";

interface SidebarProps {
  navCounts: AdminNavCounts;
  session: AdminSession;
  onNavigate?: () => void;
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

function Item({ item, count, active, onNavigate }: { item: NavItem; count?: number; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-10 items-center overflow-hidden rounded-[10px] px-3 text-sm transition-colors focus-visible:outline-white",
        active ? "bg-white/[0.12] text-white" : "text-white/70 hover:bg-white/[0.12] hover:text-white",
      )}
    >
      {/* Gold marks where you are. */}
      {active ? <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" aria-hidden /> : null}
      <span className="flex-1">{item.label}</span>
      {count ? (
        <span className="text-xs text-white/55" aria-label={`${count} waiting`}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * The staff side menu, as in the members' app: the wordmark, every page in
 * words with how many are waiting beside it, headings for the groups, and
 * who is signed in at the foot, with "Log out".
 */
export function Sidebar({ navCounts, session, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[252px] flex-col bg-navy px-4 pb-4 pt-[26px] text-white">
      <Link href="/overview" className="rounded-btn px-3 pb-1 focus-visible:outline-white" onClick={onNavigate}>
        <span className="block text-[17px] font-semibold tracking-tight">
          FoundersLink<span className="text-accent">.</span>
        </span>
        <span className="block text-xs text-white/55">Staff</span>
      </Link>

      <nav aria-label="Main" className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          const startsGroup = item.group && item.group !== NAV_ITEMS[i - 1]?.group;
          return (
            <div key={item.href}>
              {startsGroup ? <p className="mb-1.5 mt-[22px] px-3 text-[11px] text-[#B9ACD4]">{item.group}</p> : null}
              <Item item={item} count={item.countKey ? navCounts[item.countKey] : undefined} active={isActive(item.href)} onNavigate={onNavigate} />
            </div>
          );
        })}
      </nav>

      <div className="space-y-0.5 pt-2">
        <Item item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} onNavigate={onNavigate} />
        <div className="mt-2 flex items-center gap-2.5 border-t border-white/[0.16] px-2.5 pt-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-medium text-primary" aria-hidden>
            {initials(session.name)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px]">{session.name}</span>
            <span className="block text-xs text-[#C8BEDB]">Staff</span>
          </span>
          <button type="button" onClick={logout} className="rounded-full px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white">
            Log out
          </button>
        </div>
        <p className="px-2.5 pt-3 text-[11px] leading-4 text-white/45">Every decision here is recorded with your written reason.</p>
      </div>
    </aside>
  );
}
