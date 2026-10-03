import type { ChatService } from '../types/api';
import type { ChatMessage } from '../../types';
import { mockDelay } from './delay';

let listeners: ((msg: ChatMessage) => void)[] = [];
let typingListeners: ((userId: string, isTyping: boolean) => void)[] = [];

const seedMessages: ChatMessage[] = [
  {
    id: 'c0',
    groupId: 'g1',
    senderId: 'system',
    senderName: 'FounderLink',
    body: 'M-Pesa paybill 303030 is linked to this group escrow. Use member ID M2 as the account reference when paying.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: 'read',
  },
  {
    id: 'c0b',
    groupId: 'g1',
    senderId: 'system',
    senderName: 'FounderLink',
    body: 'James Kariuki was approved and added to the group. M-Pesa STK push deposits are enabled for all members.',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    status: 'read',
  },
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
    id: 'c1b',
    groupId: 'g1',
    senderId: 'm3',
    senderName: 'Amina Hassan',
    body: 'Received the STK prompt on my line — payment to paybill 303030 went through.',
    createdAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    status: 'read',
  },
  {
    id: 'c2',
    groupId: 'g1',
    senderId: 'u-founder-1',
    senderName: 'Wanjiku Mwangi',
    body: 'Asante! We will update the supplier schedule and share the delivery note in Documents.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'read',
  },
  {
    id: 'c3',
    groupId: 'g1',
    senderId: 'm4',
    senderName: 'David Otieno',
    body: 'Can we confirm the next withdrawal window after this M-Pesa reconciliation?',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
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
    const items = seedMessages.filter((m) => m.groupId === groupId);
    return {
      items,
      total: items.length,
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
    seedMessages.push(msg);
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
