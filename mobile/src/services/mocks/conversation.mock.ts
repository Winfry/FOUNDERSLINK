import type { ConversationService } from '../types/api';
import type { ChatMessage } from '../../types';
import { mockDelay } from './delay';
import { getMockSessionUserId, hasSampleInbox } from './mock-session';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

// Amina's conversations in the demo: the investor in her deal room, an
// investor who replied to her request, and the lawyer helping her.
const conversations = [
  { id: 'conv-1', type: 'deal' as const, title: 'Grace Njoroge · ClinicBook deal room', unreadCount: 1, lastMessagePreview: 'Can we schedule a call next week?', updatedAt: ago(20) },
  { id: 'conv-2', type: 'direct' as const, title: 'Wairimu Kimani', unreadCount: 1, lastMessagePreview: 'Happy to talk. Send me your numbers for the last 6 months.', updatedAt: ago(60 * 26) },
  { id: 'conv-3', type: 'direct' as const, title: 'Wanjiku Kamau', unreadCount: 0, lastMessagePreview: 'You: Thank you, that helps a lot.', updatedAt: ago(60 * 24 * 3) },
];

const msg = (id: string, conversationId: string, senderId: string, senderName: string, body: string, minutes: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id, conversationId, kind: 'user', senderId, senderName, body, createdAt: ago(minutes), ...extra,
});

const messages: ChatMessage[] = [
  { id: 'm0', conversationId: 'conv-1', kind: 'system', body: 'Grace Njoroge accepted your request. This is your deal room chat.', createdAt: ago(60 * 24 * 6) },
  msg('m1', 'conv-1', 'inv-savanna', 'Grace Njoroge', 'We reviewed ClinicBook. It is a strong fit for our health mandate.', 60 * 24 * 6 - 5),
  msg('m2', 'conv-1', 'u-amina', 'Amina Wanjiru', 'Thank you, Grace. What would you like to see first?', 60 * 24 * 5),
  msg('m3', 'conv-1', 'inv-savanna', 'Grace Njoroge', 'Your KRA PIN certificate and six months of bank statements. You can share them in the deal room.', 60 * 24 * 5 - 30),
  { id: 'm4', conversationId: 'conv-1', kind: 'system', body: 'The deal moved to due diligence.', createdAt: ago(60 * 24 * 2) },
  msg('m5', 'conv-1', 'u-scam', 'Unknown member', 'Tuma processing fee kwanza via M-Pesa.', 60 * 3, {
    warningText: 'This message asks for money. Do not send money outside a closed deal with a verified member.',
  }),
  msg('m6', 'conv-1', 'inv-savanna', 'Grace Njoroge', 'Can we schedule a call next week?', 20),

  msg('m7', 'conv-2', 'u-amina', 'Amina Wanjiru', 'Hello Wairimu. I run ClinicBook in Nairobi. We are raising KES 1M to reach three more clinics.', 60 * 30),
  msg('m8', 'conv-2', 'inv-syndicate', 'Wairimu Kimani', 'Happy to talk. Send me your numbers for the last 6 months.', 60 * 26),

  msg('m9', 'conv-3', 'kamau', 'Wanjiku Kamau', 'Yes, you need to register with the Data Commissioner before you launch, because you keep patients’ details.', 60 * 24 * 3 + 30),
  msg('m10', 'conv-3', 'u-amina', 'Amina Wanjiru', 'Thank you, that helps a lot.', 60 * 24 * 3),
];

export const mockConversationService: ConversationService = {
  async list() {
    await mockDelay();
    if (!hasSampleInbox()) return [];
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
      senderId: getMockSessionUserId() ?? 'me',
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
