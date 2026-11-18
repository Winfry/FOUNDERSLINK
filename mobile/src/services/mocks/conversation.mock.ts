import type { ConversationService } from '../types/api';
import type { ChatMessage, ConversationSummary } from '../../types';
import { mockDelay } from './delay';
import { getMockSessionUserId, hasSampleInbox } from './mock-session';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

// Amina's conversations in the demo: the investor in her deal room, an
// investor who replied to her request, and the lawyer helping her.
// Each chama has one group chat for its members, as on the backend
// (messaging.service syncCircleRoom). `owner` marks a chat a new account made
// itself, so a new member sees only her own, never the sample ones.
const conversations: (ConversationSummary & { owner?: string })[] = [
  { id: 'conv-chama-1', type: 'circle' as const, circleId: 'circle-1', title: 'Nairobi Health Founders Chama', unreadCount: 1, lastMessagePreview: 'I have sent my 25,000. Please record it, James.', updatedAt: ago(45) },
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

  { id: 'mc0', conversationId: 'conv-chama-1', kind: 'system', body: 'Amina Wanjiru started the chama. Members of the chama can talk here.', createdAt: ago(60 * 24 * 30) },
  msg('mc1', 'conv-chama-1', 'u-amina', 'Amina Wanjiru', 'Karibuni wote! This month we each put in 25,000 towards the legal fees pool.', 60 * 24 * 2),
  msg('mc2', 'conv-chama-1', 'u-2', 'James Kariuki', 'Noted. Send to the chama Paybill 303030 and I will record each one with the M-Pesa code.', 60 * 24 * 2 - 40),
  { id: 'mc3', conversationId: 'conv-chama-1', kind: 'system', body: 'James Kariuki recorded KES 50,000 from Amina Wanjiru.', createdAt: ago(60 * 24) },
  msg('mc4', 'conv-chama-1', 'u-3', 'Grace Mwangi', 'Poa. Do we still have the lawyer from last time for the clinic contracts?', 60 * 6),
  msg('mc5', 'conv-chama-1', 'u-amina', 'Amina Wanjiru', 'Yes, Wanjiku Kamau. I will ask her for a group session once the pool is full.', 60 * 5),
  msg('mc6', 'conv-chama-1', 'u-3', 'Grace Mwangi', 'I have sent my 25,000. Please record it, James.', 45),

  msg('m9', 'conv-3', 'kamau', 'Wanjiku Kamau', 'Yes, you need to register with the Data Commissioner before you launch, because you keep patients’ details.', 60 * 24 * 3 + 30),
  msg('m10', 'conv-3', 'u-amina', 'Amina Wanjiru', 'Thank you, that helps a lot.', 60 * 24 * 3),
];

/** A new chama's group chat, with a first line saying who started it. */
export function openChamaChat(circleId: string, name: string, starter: string) {
  const id = `conv-${circleId}`;
  const now = new Date().toISOString();
  conversations.unshift({ id, type: 'circle', circleId, title: name, unreadCount: 0, lastMessagePreview: 'Members of the chama can talk here.', updatedAt: now, owner: getMockSessionUserId() ?? undefined });
  messages.push({ id: `m-${id}`, conversationId: id, kind: 'system', body: `${starter} started the chama. Members of the chama can talk here.`, createdAt: now });
  return id;
}

export const mockConversationService: ConversationService = {
  async list() {
    await mockDelay();
    const me = getMockSessionUserId();
    // The demo accounts see the sample chats; everyone sees the chats they made.
    return conversations
      .filter((c) => (c.owner ? c.owner === me : hasSampleInbox()))
      .map(({ owner, ...c }) => c);
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
