import { describe, expect, it } from 'vitest';
import { verificationInvite } from '../lib/verification-invite';

describe('the verification card on each home screen', () => {
  it('asks only someone who never applied to start verification', () => {
    for (const role of ['founder', 'investor', 'expert'] as const) {
      expect(verificationInvite('draft', role)).toMatchObject({ button: 'Start verification', route: '/founder/verify' });
      expect(verificationInvite('approved', role)).toBeNull();
    }
  });

  it('sends a rejected, paused or waiting member to the status screen, which says why (FINAL_VERIFICATION 11)', () => {
    for (const role of ['founder', 'investor', 'expert'] as const) {
      for (const status of ['submitted', 'in_review', 'needs_info', 'rejected', 'suspended', 'banned'] as const) {
        const card = verificationInvite(status, role);
        expect(card?.route, `${role} ${status}`).toBe('/founder/verify/status');
        expect(card?.button, `${role} ${status}`).not.toBe('Start verification');
      }
    }
  });

  it('speaks to an expert about helping founders', () => {
    expect(verificationInvite('draft', 'expert')?.title).toBe('Verify to start helping founders');
    expect(verificationInvite('rejected', 'expert')?.text).toMatch(/founders cannot find or book you/);
  });
});
