import type { NotificationService } from '../types/api';
import type { AppNotification } from '../../types';
import { mockDelay } from './delay';

let notifications: AppNotification[] = [
  {
    id: 'n1',
    category: 'investor_request',
    title: 'New investor request',
    body: 'James Kariuki requested to join your project.',
    read: false,
    createdAt: new Date().toISOString(),
    route: '/founder/investor-request/ir-1',
  },
  {
    id: 'n2',
    category: 'withdrawal',
    title: 'Withdrawal approval needed',
    body: 'Wanjiku Mwangi requested KES 200,000 — your review is required.',
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    route: '/group/g1/withdrawal/w1',
  },
];

export const mockNotificationService: NotificationService = {
  async list() {
    await mockDelay();
    return [...notifications];
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
