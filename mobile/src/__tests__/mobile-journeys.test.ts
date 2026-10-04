import { describe, expect, it } from 'vitest';
import { mockAuthService } from '../services/mocks/auth.mock';
import { fundingService } from '../services';
import { setMockSessionUserId } from '../services/mocks/mock-session';
import { DEMO_PASSWORD } from '../services/mocks/mock-store';

describe('Mobile founder journey mocks', () => {
  it('demo founder login loads investor matches when matching consent is on', async () => {
    const { user, tokens } = await mockAuthService.login({
      email: 'amina@healthlink.demo',
      password: DEMO_PASSWORD,
    });
    expect(user.role).toBe('founder');
    expect(tokens.accessToken).toBeTruthy();
    setMockSessionUserId(user.id);
    const matches = await fundingService.getMatches();
    expect(matches.applyNow.length).toBeGreaterThan(0);
  });

  it('signup creates a founder session', async () => {
    const email = `founder.${Date.now()}@demo.test`;
    const { user } = await mockAuthService.signup({
      fullName: 'Test Founder',
      email,
      password: 'DemoPass2026!',
      role: 'founder',
      acceptTerms: true,
    });
    expect(user.emailVerified).toBe(false);
    expect(user.approvalStatus).toBe('draft');
  });
});
