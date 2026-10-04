import type { AdminNavCounts } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  FileBarChart,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Scale,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  countKey?: keyof AdminNavCounts;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/verification", label: "Verification", icon: ShieldCheck, countKey: "verificationWaiting" },
  { href: "/members", label: "Members", icon: Users },
  { href: "/deal-reviews", label: "Deal reviews", icon: ClipboardCheck, countKey: "dealReviews" },
  { href: "/reports", label: "Reports", icon: FileBarChart, countKey: "openReports" },
  { href: "/rechecks", label: "Re-checks", icon: RefreshCw, countKey: "rechecksDue" },
  { href: "/compliance-sources", label: "Compliance sources", icon: Scale },
  { href: "/chamas", label: "Chamas", icon: UsersRound },
  { href: "/audit-log", label: "Audit log", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];
