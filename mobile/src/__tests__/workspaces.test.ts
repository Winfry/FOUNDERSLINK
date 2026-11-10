import { describe, expect, it } from 'vitest';
import { WORKSPACES, isActive, workspaceFor } from '../components/layout/workspace';
import { mockAuthService } from '../services/mocks/auth.mock';
import { mockInvestorStub } from '../services/mocks/investor-stub.mock';
import { mockExpertService } from '../services/mocks/expert.mock';
import { setMockSessionUserId } from '../services/mocks/mock-session';
import { DEMO_PASSWORD } from '../services/mocks/mock-store';

const labels = (role: 'founder' | 'investor' | 'expert') => WORKSPACES[role].items.map((i) => i.label);

describe('Each member gets the workspace for what they signed up as', () => {
  it('founders find investors and save in chamas; investors and experts have no chamas', () => {
    expect(labels('founder')).toEqual(expect.arrayContaining(['Overview', 'Find investors', 'Readiness', 'Chamas']));
    expect(labels('investor')).toEqual(expect.arrayContaining(['Overview', 'Find businesses', 'Requests & deals']));
    expect(labels('investor')).not.toContain('Chamas');
    expect(labels('expert')).not.toContain('Chamas');
    expect(workspaceFor('admin')).toBeNull();
  });

  it('the menu lights up the section a page belongs to', () => {
    const network = WORKSPACES.founder.items.find((i) => i.label === 'Network')!;
    expect(isActive(network, '/connections')).toBe(true);
    expect(isActive(network, '/deal/deal-1')).toBe(true);
    expect(isActive(network, '/connectionsx')).toBe(false);
  });

  it('the demo investor is matched with businesses that fit what she funds', async () => {
    const { user } = await mockAuthService.login({ email: 'grace@savanna.demo', password: DEMO_PASSWORD });
    expect(user.role).toBe('investor');
    setMockSessionUserId(user.id);
    const found = await mockInvestorStub.discover();
    expect(found.needsFund).toBe(false);
    expect(found.founders.length).toBeGreaterThan(0);
    expect(found.founders[0].band).toBe('strong');
    expect(found.founders.every((f) => !f.anonymised)).toBe(true);
    expect((await mockInvestorStub.getJoinRequests()).length).toBeGreaterThan(0);
  });

  it('the demo expert sees founders asking for help, and can accept', async () => {
    const { user } = await mockAuthService.login({ email: 'wanjiku@expert.demo', password: DEMO_PASSWORD });
    expect(user.role).toBe('expert');
    setMockSessionUserId(user.id);
    const sessions = await mockExpertService.listSessions();
    const asked = sessions.find((s) => s.status === 'requested')!;
    expect(asked).toBeTruthy();
    await mockExpertService.answer(asked.id, 'accepted');
    expect((await mockExpertService.listSessions()).find((s) => s.id === asked.id)?.status).toBe('accepted');
  });
});
