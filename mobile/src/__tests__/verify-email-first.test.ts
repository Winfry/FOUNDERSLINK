import { describe, expect, it } from 'vitest';
import { mockAuthService } from '../services/mocks/auth.mock';
import { mockVettingService } from '../services/mocks/vetting.mock';
import { DEMO_CODE } from '../services/mocks/demo-code';
import { setMockSessionUserId } from '../services/mocks/mock-session';
import { DEMO_PASSWORD } from '../services/mocks/mock-store';

describe('Verifying as a new founder (demo data)', () => {
  it('asks for the email first, and submits once it is confirmed', async () => {
    const { user } = await mockAuthService.login({ email: 'new@founder.demo', password: DEMO_PASSWORD });
    setMockSessionUserId(user.id);

    // The screen knows before she writes her statement.
    expect((await mockVettingService.getApplication()).emailVerified).toBe(false);
    await expect(mockVettingService.submit()).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });

    await mockAuthService.verifyEmailOtp(DEMO_CODE);
    expect((await mockVettingService.getApplication()).emailVerified).toBe(true);
    const submitted = await mockVettingService.submit();
    expect(submitted.approvalStatus).toBe('submitted');
  });
});
