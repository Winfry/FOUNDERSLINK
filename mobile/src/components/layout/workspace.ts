import type { UserRole } from '../../types';

/**
 * What each kind of member sees: their own workspace, made for what they
 * came to do. A founder finds investors, gets ready and saves in chamas; an
 * investor finds businesses to back; an expert helps founders.
 *
 * The side menu on a computer lists every item, in words, with a count
 * beside the ones that have one ("Investors 9", "Readiness 4/7"). There are
 * no icons: every place is named.
 */
export type CountKey = 'investors' | 'readiness' | 'deals' | 'messages' | 'businesses' | 'requests' | 'sessions';

export interface WorkspaceItem {
  label: string;
  href: string;
  /** Paths that light this item up, besides its own. */
  also?: string[];
  /** The heading it sits under in the side menu ("Community", "Assistant"). */
  group?: string;
  /** Which count to show beside it, if any. */
  count?: CountKey;
}

export interface Workspace {
  name: string;
  home: string;
  items: WorkspaceItem[];
  notifications: string;
  profile: string;
}

const messages: WorkspaceItem = { label: 'Messages', href: '/conversations', count: 'messages' };
const deals: WorkspaceItem = { label: 'Deal rooms', href: '/deals', also: ['/deal'], count: 'deals' };

export const WORKSPACES: Record<'founder' | 'investor' | 'expert', Workspace> = {
  founder: {
    name: 'Founder workspace',
    home: '/home',
    notifications: '/(founder)/(tabs)/notifications',
    profile: '/(founder)/(tabs)/profile',
    items: [
      { label: 'Overview', href: '/home' },
      { label: 'Investors', href: '/matches', also: ['/founder/investor-match'], count: 'investors' },
      { label: 'Readiness', href: '/readiness', count: 'readiness' },
      deals,
      messages,
      { label: 'Network', href: '/connections', group: 'Community' },
      { label: 'Chamas', href: '/chamas', also: ['/chama'], group: 'Community' },
      { label: 'Co-pilot', href: '/copilot', group: 'Assistant' },
    ],
  },
  investor: {
    name: 'Investor workspace',
    home: '/overview',
    notifications: '/(investor)/(tabs)/notifications',
    profile: '/(investor)/(tabs)/profile',
    items: [
      { label: 'Overview', href: '/overview' },
      { label: 'Businesses', href: '/discover', also: ['/investor/founder', '/investor/join-request'], count: 'businesses' },
      { label: 'Requests', href: '/requests', count: 'requests' },
      deals,
      messages,
      { label: 'My investments', href: '/investments', also: ['/investor/investment'], group: 'Portfolio' },
      { label: 'What you fund', href: '/investor/onboarding', group: 'Your fund' },
      { label: 'Profile', href: '/profile', also: ['/founder/verify'], group: 'Your fund' },
    ],
  },
  expert: {
    name: 'Expert workspace',
    home: '/sessions',
    notifications: '/(expert)/(tabs)/updates',
    profile: '/(expert)/(tabs)/expert-profile',
    items: [
      { label: 'Overview', href: '/sessions', count: 'sessions' },
      deals,
      messages,
      { label: 'Profile', href: '/expert-profile', also: ['/expert/onboarding', '/founder/verify'], group: 'Your practice' },
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
