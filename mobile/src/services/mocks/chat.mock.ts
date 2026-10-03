import type { ChatService } from '../types/api';
import type { ChatMessage } from '../../types';
import { mockDelay } from './delay';

let listeners: ((msg: ChatMessage) => void)[] = [];
let typingListeners: ((userId: string, isTyping: boolean) => void)[] = [];

const seedMessages: ChatMessage[] = [
  {
    id: 'c1',
    groupId: 'g1',
    senderId: 'm2',
    senderName: 'James Kariuki',
    body: 'Deposit sent via M-Pesa — reference QK4H2.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'read',
  },
  {
    id: 'c2',
    groupId: 'g1',
    senderId: 'u-founder-1',
    senderName: 'Wanjiku Mwangi',
    body: 'Asante! We will update the supplier schedule.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'read',
  },
];

export const mockChatService: ChatService = {
  async connect() {
    await mockDelay(200);
  },
  async disconnect() {
    await mockDelay(100);
  },
  async getMessages(groupId, _cursor) {
    await mockDelay();
    return {
      items: seedMessages.filter((m) => m.groupId === groupId),
      total: seedMessages.length,
      page: 1,
      pageSize: 50,
    };
  },
  async sendMessage(groupId, payload) {
    const msg: ChatMessage = {
      id: `c-${Date.now()}`,
      groupId,
      senderId: 'u-founder-1',
      senderName: 'You',
      body: payload.body ?? '',
      createdAt: new Date().toISOString(),
      status: 'sent',
      replyToId: payload.replyToId,
    };
    await mockDelay(300);
    listeners.forEach((fn) => fn(msg));
    return msg;
  },
  async markRead() {
    await mockDelay(100);
  },
  onMessage(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter((fn) => fn !== callback);
    };
  },
  onTyping(callback) {
    typingListeners.push(callback);
    return () => {
      typingListeners = typingListeners.filter((fn) => fn !== callback);
    };
  },
  async setTyping(_groupId, isTyping) {
    if (isTyping) typingListeners.forEach((fn) => fn('m2', true));
  },
};
