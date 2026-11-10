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
  Sparkles,
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
  /**
   * The engine it belongs to (FoundersLink is one ecosystem with two
   * connected engines): "Build & grow" helps a founder build her business,
   * "Capital & connections" connects her to investors and people.
   */
  group?: string;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
}

export interface Workspace {
  name: string;
  home: string;
  items: WorkspaceItem[];
  notifications: string;
  profile: string;
}

const BUILD = 'Build & grow';
const CONNECT = 'Capital & connections';
const ACCOUNT = 'Account';
const messages: WorkspaceItem = { label: 'Messages', href: '/conversations', icon: MessagesSquare, group: CONNECT };
const settings: WorkspaceItem = { label: 'Settings', href: '/settings', icon: Settings, group: ACCOUNT };

export const WORKSPACES: Record<'founder' | 'investor' | 'expert', Workspace> = {
  founder: {
    name: 'Founder workspace',
    home: '/home',
    notifications: '/(founder)/(tabs)/notifications',
    profile: '/(founder)/(tabs)/profile',
    items: [
      { label: 'Overview', href: '/home', icon: LayoutDashboard },
      { label: 'AI Co-pilot', href: '/copilot', icon: Sparkles },
      { label: 'Business profile', href: '/profile', also: ['/founder/verify', '/founder/onboarding'], icon: CircleUserRound, group: BUILD },
      { label: 'Readiness', href: '/readiness', icon: ClipboardCheck, group: BUILD },
      { label: 'Chamas', href: '/chamas', also: ['/chama'], icon: HandCoins, group: BUILD },
      { label: 'Find investors', href: '/matches', also: ['/founder/investor-match'], icon: Handshake, group: CONNECT },
      { label: 'Network', href: '/connections', also: ['/deal'], icon: UsersRound, group: CONNECT },
      messages,
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
      { label: 'Find businesses', href: '/discover', also: ['/investor/founder', '/investor/join-request'], icon: Compass, group: CONNECT },
      { label: 'Requests & deals', href: '/requests', also: ['/deal'], icon: Send, group: CONNECT },
      messages,
      { label: 'Profile', href: '/profile', also: ['/investor/onboarding', '/founder/verify'], icon: CircleUserRound, group: ACCOUNT },
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
      { ...messages, group: 'Helping founders' },
      { label: 'Profile', href: '/expert-profile', also: ['/expert/onboarding', '/founder/verify'], icon: CircleUserRound, group: ACCOUNT },
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
