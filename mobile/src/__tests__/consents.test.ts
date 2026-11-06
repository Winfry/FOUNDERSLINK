import { describe, expect, it } from 'vitest';
import { mockAuthService } from '../services/mocks/auth.mock';
import { mockConsentService } from '../services/mocks/consent.mock';
import { mockFounderService } from '../services/mocks/founder-profile.mock';
import { setMockSessionUserId } from '../services/mocks/mock-session';
import { DEMO_PASSWORD } from '../services/mocks/mock-store';
import { consentWording } from '../lib/consents';

describe('consents, each on its own (FINAL_VERIFICATION 21)', () => {
  it('a founder is asked all five, an investor the four that apply', () => {
    expect(consentWording('founder').map((c) => c.purpose)).toEqual([
      'profile_visibility',
      'ai_matching',
      'eligibility_attributes',
      'contact',
      'document_processing',
    ]);
    expect(consentWording('investor').map((c) => c.purpose)).not.toContain('eligibility_attributes');
    expect(consentWording('investor').find((c) => c.purpose === 'ai_matching')?.label).toBe('Match me with founders');
  });

  it('turning one off changes only that one, and her profile stays', async () => {
    const { user } = await mockAuthService.login({ email: 'amina@healthlink.demo', password: DEMO_PASSWORD });
    setMockSessionUserId(user.id);
    const profileBefore = await mockFounderService.getProfile();
    const before = await mockConsentService.list('founder');

    await mockConsentService.set('ai_matching', false);
    const after = await mockConsentService.list('founder');

    expect(after.find((c) => c.purpose === 'ai_matching')?.granted).toBe(false);
    for (const c of after.filter((c) => c.purpose !== 'ai_matching')) {
      expect(c.granted).toBe(before.find((b) => b.purpose === c.purpose)?.granted);
    }
    expect(await mockFounderService.getProfile()).toEqual(profileBefore);

    await mockConsentService.set('ai_matching', true);
    expect((await mockConsentService.list('founder')).find((c) => c.purpose === 'ai_matching')?.granted).toBe(true);
  });
});
