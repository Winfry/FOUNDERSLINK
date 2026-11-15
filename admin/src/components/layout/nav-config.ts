import type { AdminNavCounts } from "@/types";

/**
 * The staff side menu, in words (no icons), as in the members' app. Items
 * with a count show how many are waiting. `group` is the heading an item
 * sits under.
 */
export interface NavItem {
  href: string;
  label: string;
  group?: string;
  countKey?: keyof AdminNavCounts;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview" },
  { href: "/verification", label: "Verification", countKey: "verificationWaiting", group: "Checks" },
  { href: "/deal-reviews", label: "Deal reviews", countKey: "dealReviews", group: "Checks" },
  { href: "/reports", label: "Reports", countKey: "openReports", group: "Checks" },
  { href: "/rechecks", label: "Re-checks", countKey: "rechecksDue", group: "Checks" },
  { href: "/members", label: "Members", group: "Community" },
  { href: "/chamas", label: "Chamas", group: "Community" },
  { href: "/compliance-sources", label: "Compliance sources", group: "Records" },
  { href: "/audit-log", label: "Audit log", group: "Records" },
];

/** Settings sits at the foot of the menu, above who is signed in. */
export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings" };
