import type { ChatMessage } from '../../types';
import { mockConversationService } from './conversation.mock';

/** Legacy ChatPanel adapter — maps groupId to conversationId */
export const mockChatAdapter = {
  async connect(_groupId: string) {},
  async disconnect() {},
  async getMessages(groupId: string) {
    const res = await mockConversationService.getMessages(groupId);
    return res;
  },
  async sendMessage(groupId: string, payload: Partial<ChatMessage>) {
    return mockConversationService.sendMessage(groupId, payload.body ?? '');
  },
  async markRead() {},
  onMessage(_cb: (msg: ChatMessage) => void) {
    return () => {};
  },
  onTyping(_cb: (userId: string, isTyping: boolean) => void) {
    return () => {};
  },
  async setTyping() {},
};
