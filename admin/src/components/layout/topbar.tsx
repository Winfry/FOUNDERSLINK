"use client";

interface TopbarProps {
  onMenuClick?: () => void;
}

/**
 * On a narrow window only: a deep purple bar with the wordmark and a
 * "Menu" button that opens the side menu. On a wide window the side menu
 * is always there and pages open with their own heading, as in the design.
 */
export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 bg-navy px-4 text-white lg:hidden">
      <span className="text-[15px] font-semibold tracking-tight">
        FoundersLink<span className="text-accent">.</span> <span className="text-xs font-normal text-white/55">Staff</span>
      </span>
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-full border border-white/25 bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium text-white"
      >
        Menu
      </button>
    </header>
  );
}
