import { describe, expect, it } from 'vitest';
import { mockCircleService } from '../services/mocks/circle.mock';
import { mockConversationService } from '../services/mocks/conversation.mock';
import { mockAuthService } from '../services/mocks/auth.mock';
import { setMockSessionUserId } from '../services/mocks/mock-session';

describe('every chama has its own group chat', () => {
  it("Amina's chama chat is in her Messages, linked to her chama, with every member talking", async () => {
    setMockSessionUserId('u-amina');
    const chats = await mockConversationService.list();
    const chat = chats.find((c) => c.type === 'circle' && c.circleId === 'circle-1');
    expect(chat?.title).toBe('Nairobi Health Founders Chama');

    const { items } = await mockConversationService.getMessages(chat!.id);
    const speakers = new Set(items.filter((m) => m.kind === 'user').map((m) => m.senderName));
    expect([...speakers].sort()).toEqual(['Amina Wanjiru', 'Grace Mwangi', 'James Kariuki']);
    expect(items[0]!.kind).toBe('system');
    setMockSessionUserId(null);
  });

  it('a new founder who starts a chama is its organiser, and gets its chat; nobody else sees it', async () => {
    const { user } = await mockAuthService.signup({ fullName: 'Akinyi Achieng', email: `akinyi-${Math.random().toString(36).slice(2)}@new.demo`, password: 'NewPass2026!x', role: 'founder', acceptTerms: true } as never);
    setMockSessionUserId(user.id);
    const chama = await mockCircleService.create({ name: 'Nakuru Dairy Founders', type: 'money' } as never);
    expect(chama.members[0]).toMatchObject({ userId: user.id, name: 'Akinyi Achieng', role: 'organiser' });

    const mine = await mockConversationService.list();
    const chat = mine.find((c) => c.circleId === chama.id);
    expect(chat).toMatchObject({ type: 'circle', title: 'Nakuru Dairy Founders' });
    // A new account sees its own chama chat, not the demo's sample chats.
    expect(mine.some((c) => c.circleId === 'circle-1')).toBe(false);
    const { items } = await mockConversationService.getMessages(chat!.id);
    expect(items[0]!.body).toBe('Akinyi Achieng started the chama. Members of the chama can talk here.');

    // Another account does not see it.
    setMockSessionUserId('u-amina');
    expect((await mockConversationService.list()).some((c) => c.circleId === chama.id)).toBe(false);
    setMockSessionUserId(null);
  });
});
