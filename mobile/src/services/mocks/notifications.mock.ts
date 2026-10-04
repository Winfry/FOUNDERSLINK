import type { NotificationService } from '../types/api';
import type { AppNotification } from '../../types';
import { mockDelay } from './delay';

let notifications: AppNotification[] = [
  {
    id: 'n1',
    title: 'New join request',
    body: 'Savanna Angels sent a join request with a proposed amount of KES 1,000,000.',
    read: false,
    createdAt: new Date().toISOString(),
    link: '/(founder)/(tabs)/connections',
  },
  {
    id: 'n2',
    title: 'Verification update',
    body: 'We are checking your details. You can keep exploring.',
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    link: '/founder/verify/status',
  },
];

export const mockNotificationService: NotificationService = {
  async list() {
    await mockDelay();
    const unreadCount = notifications.filter((n) => !n.read).length;
    return { unreadCount, notifications: [...notifications] };
  },
  async markRead(id) {
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    await mockDelay(100);
  },
  async markAllRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    await mockDelay(100);
  },
};
