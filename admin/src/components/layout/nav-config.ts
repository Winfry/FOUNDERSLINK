import type { AdminRole } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  UserCheck,
  UserCircle,
  Users,
  UsersRound,
  ArrowLeftRight,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AdminRole[] | "all";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: "all" },
  { href: "/founders", label: "Founders", icon: Users, roles: "all" },
  {
    href: "/founder-applications",
    label: "Founder applications",
    icon: ClipboardList,
    roles: ["super_admin", "reviewer"],
  },
  {
    href: "/investor-applications",
    label: "Investor applications",
    icon: ClipboardList,
    roles: ["super_admin", "reviewer"],
  },
  { href: "/investors", label: "Investors", icon: UserCheck, roles: "all" },
  { href: "/groups", label: "Groups", icon: UsersRound, roles: ["super_admin", "reviewer"] },
  { href: "/withdrawals", label: "Transactions", icon: ArrowLeftRight, roles: "all" },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["super_admin", "reviewer"] },
  { href: "/profile", label: "Admin profile", icon: UserCircle, roles: "all" },
];

export function navForRole(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles === "all" || item.roles.includes(role));
}
