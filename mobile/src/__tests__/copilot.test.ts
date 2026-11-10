import { describe, expect, it } from 'vitest';
import { mockAuthService } from '../services/mocks/auth.mock';
import { mockCopilotService } from '../services/mocks/copilot.mock';
import { setMockSessionUserId } from '../services/mocks/mock-session';
import { DEMO_PASSWORD } from '../services/mocks/mock-store';

describe('The founder co-pilot (demo data)', () => {
  it('plans from her own data and only adds a task when she approves it', async () => {
    const { user } = await mockAuthService.login({ email: 'amina@healthlink.demo', password: DEMO_PASSWORD });
    setMockSessionUserId(user.id);

    const answer = await mockCopilotService.ask('What should I focus on this week?');
    expect(answer.reply).toContain('Amina');
    expect(answer.proposals.length).toBeGreaterThan(0);
    expect(answer.proposals.every((t) => t.status === 'proposed')).toBe(true);
    expect((await mockCopilotService.tasks()).every((t) => t.status === 'proposed')).toBe(true);

    const approved = await mockCopilotService.decide(answer.proposals[0].id, 'approve');
    expect(approved.status).toBe('open');

    const again = await mockCopilotService.ask('And now?');
    const titles = [...(await mockCopilotService.tasks())].map((t) => t.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(again.proposals.find((p) => p.title === approved.title)).toBeUndefined();

    const log = (await mockCopilotService.activity()).map((a) => a.text).join('\n');
    expect(log).toMatch(/You asked/);
    expect(log).toMatch(/You approved/);
  });
});
