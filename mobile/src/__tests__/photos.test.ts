import { describe, expect, it } from 'vitest';
import { photoUri } from '../lib/photo-url';
import { portraitFor } from '../lib/portraits';

describe('photo addresses', () => {
  it('nothing when there is no photo', () => {
    expect(photoUri(null)).toBeUndefined();
    expect(photoUri(undefined)).toBeUndefined();
    expect(photoUri('')).toBeUndefined();
  });

  it("keeps a picked file's address as it is", () => {
    expect(photoUri('file:///data/photo.jpg')).toBe('file:///data/photo.jpg');
    expect(photoUri('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
  });

  it("makes the backend's /media address whole", () => {
    // Without EXPO_PUBLIC_API_URL the address stays relative to the app.
    expect(photoUri('/media/photos/abc123')).toMatch(/\/media\/photos\/abc123$/);
  });
});

describe('the demo photo service', () => {
  it('adds her photo to her account, and removes it', async () => {
    const { setMockSessionUserId } = await import('../services/mocks/mock-session');
    const { mockPhotoService } = await import('../services/mocks/photo.mock');
    const { getMemberById } = await import('../services/mocks/mock-store');

    setMockSessionUserId('u-amina');
    expect(await mockPhotoService.upload('file:///amina.jpg')).toBe('file:///amina.jpg');
    expect(getMemberById('u-amina')?.user.avatarUrl).toBe('file:///amina.jpg');
    await mockPhotoService.remove();
    expect(getMemberById('u-amina')?.user.avatarUrl).toBeUndefined();
    setMockSessionUserId(null);
  });
});

describe('a face goes with a name', () => {
  it("the demo investor David has a face, and a hidden name has none", () => {
    expect(portraitFor('David Otieno')).toBeDefined();
    // What a founder sees before she is verified: a kind of investor, not a person.
    expect(portraitFor('Angel investor · Health')).toBeUndefined();
  });

  it('the demo investor page carries no photo for a hidden investor', async () => {
    const { setMockSessionUserId } = await import('../services/mocks/mock-session');
    const { mockFundingService } = await import('../services/mocks/funding.mock');
    const { mockAuthService } = await import('../services/mocks/auth.mock');
    const { mockFounderService } = await import('../services/mocks/founder-profile.mock');
    const { mockConsentService } = await import('../services/mocks/consent.mock');

    // A new, unverified founder sees investors without names, so without faces.
    const { user } = await mockAuthService.signup({ fullName: 'New Founder', email: `nf-${Math.random().toString(36).slice(2)}@new.demo`, password: 'NewPass2026!x', role: 'founder', acceptTerms: true } as never);
    setMockSessionUserId(user.id);
    await mockFounderService.saveProfile({
      businessName: 'Test', sector: 'health', stage: 'mvp', county: 'Nairobi', description: 'A clinic app.', fundingAmountKes: 1_000_000,
      journeyType: 'startup', businessStatus: 'registered_business_name', instruments: ['equity'], hasEmployees: false, handlesPersonalData: true, alreadyHave: [], profileCompleteness: 40,
    });
    await mockConsentService.set('ai_matching', true);
    const m = await mockFundingService.getMatches();
    const first = m.applyNow[0]!;
    const page = await mockFundingService.getInvestorProfile(first.investorUserId);
    expect(page.anonymised).toBe(true);
    expect(page.photoUrl).toBeNull();
    expect(portraitFor(String(page.displayName))).toBeUndefined();

    // Amina is verified: David is named, and has a face.
    setMockSessionUserId('u-amina');
    const david = await mockFundingService.getInvestorProfile('inv-lakeside');
    expect(david.displayName).toBe('David Otieno');
    expect(portraitFor(String(david.displayName))).toBeDefined();
    setMockSessionUserId(null);
  });
});
