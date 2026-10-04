import type { ConversationService } from '../types/api';
import type { ChatMessage, ConversationSummary } from '../../types';
import { get, post, put } from './client';

interface ApiMessage {
  id: string;
  conversation_id: string;
  kind: 'user' | 'system';
  sender: { id: string; full_name: string } | null;
  body: string;
  // Set by the backend when a message from someone else may be asking for money.
  warning: { text: string } | null;
  created_at: string;
}

interface ApiConversation {
  id: string;
  type: ConversationSummary['type'];
  title: string;
  unread_count: number;
  last_message: ApiMessage | null;
  last_activity: string;
}

function toMessage(m: ApiMessage): ChatMessage {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    kind: m.kind,
    senderId: m.sender?.id,
    senderName: m.sender?.full_name,
    body: m.body,
    createdAt: m.created_at,
    warningText: m.warning?.text,
  };
}

export const httpConversationService: ConversationService = {
  async list() {
    // "Chat appears after you connect": a direct chat is opened with
    // each accepted connection. Opening one that exists changes nothing.
    const connections = await get<{ status: string; with: { id: string } }[]>('/connections').catch(() => []);
    await Promise.all(
      connections.filter((c) => c.status === 'accepted').map((c) => post('/conversations', { user_id: c.with.id }).catch(() => null)),
    );

    const rows = await get<ApiConversation[]>('/conversations');
    return rows.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      unreadCount: c.unread_count,
      lastMessagePreview: c.last_message?.body,
      updatedAt: c.last_activity,
    }));
  },

  // The backend sends the newest first, and older pages by the id of
  // the last message seen. The screen reads top to bottom, oldest first.
  async getMessages(conversationId, cursor) {
    const page = await get<{ messages: ApiMessage[] }>(
      `/conversations/${conversationId}/messages${cursor ? `?before=${cursor}` : ''}`,
    );
    const items = page.messages.map(toMessage).reverse();
    return { items, total: items.length, page: 1, pageSize: 50 };
  },

  async sendMessage(conversationId, body) {
    return toMessage(await post<ApiMessage>(`/conversations/${conversationId}/messages`, { body }));
  },

  async markRead(conversationId) {
    await post(`/conversations/${conversationId}/read`);
  },

  async reportMessage(messageId, reason) {
    await post(`/messages/${messageId}/report`, { reason });
  },

  async blockMember(userId) {
    await put(`/users/${userId}/block`);
  },
};
