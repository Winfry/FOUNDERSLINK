import type { ApprovalStatus } from '../types';

export interface VerificationInvite {
  title: string;
  text: string;
  button: string;
  route: '/founder/verify' | '/founder/verify/status';
}

// The card at the top of Matches (founder) and Discover (investor) for a
// member who is not approved. Each status gets its own words: only a
// member who has never applied is asked to "Start verification". Anyone
// already decided is sent to the status screen, which says why
// (FINAL_VERIFICATION 11).
export function verificationInvite(status: ApprovalStatus | undefined, role: 'founder' | 'investor'): VerificationInvite | null {
  const founder = role === 'founder';
  const toStatus = '/founder/verify/status' as const;
  switch (status) {
    case 'approved':
      return null;
    case 'submitted':
    case 'in_review':
      return {
        title: "We're checking your details",
        text: founder
          ? 'Names and the Connect button open as soon as FoundersLink approves you.'
          : 'Names and founder pages open as soon as FoundersLink approves you.',
        button: founder ? 'See my verification status' : 'See my status',
        route: toStatus,
      };
    case 'needs_info':
      return {
        title: 'We need a little more from you',
        text: 'Read what our reviewer asked, then update your details and send them again.',
        button: 'See what is needed',
        route: toStatus,
      };
    case 'rejected':
      return {
        title: 'Not approved',
        text: founder
          ? 'Your verification was not approved, so investor names and connecting stay closed.'
          : 'Your verification was not approved, so founder names and pages stay closed.',
        button: 'See why',
        route: toStatus,
      };
    case 'suspended':
      return {
        title: 'Your account is paused',
        text: 'You cannot connect or message for now.',
        button: 'See why',
        route: toStatus,
      };
    case 'banned':
      return {
        title: 'Your account is closed',
        text: 'You can no longer connect or message on FoundersLink.',
        button: 'See why',
        route: toStatus,
      };
    default:
      return {
        title: founder ? 'Verify to connect' : 'Verify to see who they are',
        text: founder
          ? 'Verify once to see investor names and send them a request to connect.'
          : 'Verify once to see founder names, open their pages and ask to join.',
        button: 'Start verification',
        route: '/founder/verify',
      };
  }
}
