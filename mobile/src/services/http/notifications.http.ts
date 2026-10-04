import type { NotificationService } from '../types/api';
import { get, post } from './client';

interface ApiNotification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

// The backend names the thing a notification is about. These are the
// screens the app has for each.
function screenFor(link: string | null): string | undefined {
  if (!link) return undefined;
  const deal = link.match(/^\/deals\/([^/]+)/);
  if (deal) return `/deal/${deal[1]}`;
  if (link.startsWith('/connections')) return '/(founder)/(tabs)/connections';
  if (link.startsWith('/vetting')) return '/founder/verify/status';
  if (link.startsWith('/compliance')) return '/(founder)/(tabs)/readiness';
  if (link.startsWith('/conversations')) return '/conversations';
  // Anything the app has no screen for is shown without a link.
  return undefined;
}

export const httpNotificationService: NotificationService = {
  async list() {
    const answer = await get<{ unread_count: number; notifications: ApiNotification[] }>('/notifications');
    return {
      unreadCount: answer.unread_count,
      notifications: answer.notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read_at !== null,
        createdAt: n.created_at,
        link: screenFor(n.link),
      })),
    };
  },

  async markRead(id) {
    await post(`/notifications/${id}/read`);
  },

  async markAllRead() {
    await post('/notifications/read-all');
  },
};
