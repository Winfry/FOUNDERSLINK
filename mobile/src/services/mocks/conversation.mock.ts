import type { ConversationService } from '../types/api';
import type { ChatMessage } from '../../types';
import { mockDelay } from './delay';

const conversations = [
  {
    id: 'conv-1',
    type: 'direct' as const,
    title: 'Savanna Angels',
    unreadCount: 1,
    lastMessagePreview: 'Can we schedule a call next week?',
    updatedAt: new Date().toISOString(),
  },
];

const messages: ChatMessage[] = [
  {
    id: 'm1',
    conversationId: 'conv-1',
    kind: 'user',
    senderId: 'inv-savanna',
    senderName: 'Savanna Angels',
    body: 'We reviewed ClinicBook — strong fit for our health mandate.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'm2',
    conversationId: 'conv-1',
    kind: 'user',
    senderId: 'u-scam',
    senderName: 'Unknown member',
    body: 'Tuma processing fee kwanza via M-Pesa.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    warningText: 'This message asks for money. Do not send money outside a closed deal with a verified member.',
  },
];

export const mockConversationService: ConversationService = {
  async list() {
    await mockDelay();
    return conversations;
  },

  async getMessages(conversationId, _cursor) {
    await mockDelay();
    const items = messages.filter((m) => m.conversationId === conversationId);
    return { items, total: items.length, page: 1, pageSize: 50 };
  },

  async sendMessage(conversationId, body) {
    await mockDelay(300);
    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      conversationId,
      kind: 'user',
      senderId: 'me',
      senderName: 'You',
      body,
      createdAt: new Date().toISOString(),
    };
    messages.push(msg);
    return msg;
  },

  async markRead(conversationId) {
    await mockDelay(100);
    void conversationId;
  },

  async reportMessage(messageId, reason) {
    await mockDelay();
    void messageId;
    void reason;
  },

  async blockMember(userId) {
    await mockDelay();
    void userId;
  },
};
