import type { ComponentType } from 'react';
import {
  CalendarCheck,
  CircleUserRound,
  ClipboardCheck,
  Compass,
  HandCoins,
  Handshake,
  LayoutDashboard,
  MessagesSquare,
  Send,
  Settings,
  UsersRound,
} from 'lucide-react-native';
import type { UserRole } from '../../types';

/**
 * What each kind of member sees: their own workspace, made for what they
 * came to do. A founder finds investors, gets ready and saves in chamas; an
 * investor finds businesses to back; an expert helps founders. The same
 * list drives the side menu on a computer and the tabs on a phone.
 */
export interface WorkspaceItem {
  label: string;
  href: string;
  /** Paths that light this item up, besides its own. */
  also?: string[];
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
}

export interface Workspace {
  name: string;
  home: string;
  items: WorkspaceItem[];
  notifications: string;
  profile: string;
}

const messages: WorkspaceItem = { label: 'Messages', href: '/conversations', icon: MessagesSquare };
const settings: WorkspaceItem = { label: 'Settings', href: '/settings', icon: Settings };

export const WORKSPACES: Record<'founder' | 'investor' | 'expert', Workspace> = {
  founder: {
    name: 'Founder workspace',
    home: '/home',
    notifications: '/(founder)/(tabs)/notifications',
    profile: '/(founder)/(tabs)/profile',
    items: [
      { label: 'Overview', href: '/home', icon: LayoutDashboard },
      { label: 'Find investors', href: '/matches', also: ['/founder/investor-match'], icon: Handshake },
      { label: 'Readiness', href: '/readiness', icon: ClipboardCheck },
      { label: 'Network', href: '/connections', also: ['/deal'], icon: UsersRound },
      { label: 'Chamas', href: '/chamas', also: ['/chama'], icon: HandCoins },
      messages,
      { label: 'Profile', href: '/profile', also: ['/founder/verify', '/founder/onboarding'], icon: CircleUserRound },
      settings,
    ],
  },
  investor: {
    name: 'Investor workspace',
    home: '/overview',
    notifications: '/(investor)/(tabs)/notifications',
    profile: '/(investor)/(tabs)/profile',
    items: [
      { label: 'Overview', href: '/overview', icon: LayoutDashboard },
      { label: 'Find businesses', href: '/discover', also: ['/investor/founder', '/investor/join-request'], icon: Compass },
      { label: 'Requests & deals', href: '/requests', also: ['/deal'], icon: Send },
      messages,
      { label: 'Profile', href: '/profile', also: ['/investor/onboarding', '/founder/verify'], icon: CircleUserRound },
      settings,
    ],
  },
  expert: {
    name: 'Expert workspace',
    home: '/sessions',
    notifications: '/(expert)/(tabs)/updates',
    profile: '/(expert)/(tabs)/expert-profile',
    items: [
      { label: 'Overview', href: '/sessions', icon: CalendarCheck },
      messages,
      { label: 'Profile', href: '/expert-profile', also: ['/expert/onboarding', '/founder/verify'], icon: CircleUserRound },
      settings,
    ],
  },
};

export function workspaceFor(role: UserRole | null | undefined): Workspace | null {
  return role === 'founder' || role === 'investor' || role === 'expert' ? WORKSPACES[role] : null;
}

/** Whether the page at `path` belongs under this menu item. */
export function isActive(item: WorkspaceItem, path: string) {
  return [item.href, ...(item.also ?? [])].some((p) => path === p || path.startsWith(`${p}/`));
}

/** The time-of-day greeting for the top of a home screen. */
export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
