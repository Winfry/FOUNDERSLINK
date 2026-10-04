import type { ApprovalStatus, UserRole } from '../types';

/**
 * What to tell a member who is not verified, and where the button takes
 * her. One place, so the Matches banner, Discover, the profile card and
 * the "you must be approved" screen all say the same thing.
 */
export type VerificationKind = 'verify' | 'checking' | 'needs_info' | 'rejected' | 'paused' | 'approved';

export interface VerificationWords {
  kind: VerificationKind;
  /** The short heading. */
  title: string;
  /** One or two sentences under it, in words that fit her role. */
  body: string;
  /** The button's label. */
  action: string;
  /** Where the button goes. Only a member who has not started is sent to the form. */
  href: '/founder/verify' | '/founder/verify/status';
  /** Whether the button starts something (true) or only shows her status. */
  starts: boolean;
}

const STATUS = '/founder/verify/status' as const;

export function verificationKind(status: ApprovalStatus | undefined): VerificationKind {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'submitted':
    case 'in_review':
      return 'checking';
    case 'needs_info':
      return 'needs_info';
    case 'rejected':
      return 'rejected';
    case 'suspended':
    case 'banned':
      return 'paused';
    default:
      return 'verify';
  }
}

export function verificationWords(status: ApprovalStatus | undefined, role: UserRole | undefined): VerificationWords {
  const investor = role === 'investor';
  const others = investor ? 'founders' : 'investors';
  const kind = verificationKind(status);

  switch (kind) {
    case 'approved':
      return {
        kind,
        title: "You're verified",
        body: `You can connect and chat with ${others}.`,
        action: 'See my status',
        href: STATUS,
        starts: false,
      };
    case 'checking':
      return {
        kind,
        title: "We're checking your details",
        body: `Names, connections and chat open as soon as FoundersLink approves you. You can keep exploring while you wait.`,
        action: 'See my status',
        href: STATUS,
        starts: false,
      };
    case 'needs_info':
      return {
        kind,
        title: 'We need a little more from you',
        body: 'Open your status to see what is missing and send it again.',
        action: 'Open my status',
        href: STATUS,
        starts: true,
      };
    case 'rejected':
      return {
        kind,
        title: 'Your verification was not approved',
        body: `You cannot connect with ${others} for now. Open your status to see what our reviewer said.`,
        action: 'See my status',
        href: STATUS,
        starts: false,
      };
    case 'paused':
      return {
        kind,
        title: 'Your account is paused',
        body: `You cannot connect with ${others} or message them for now. Open your status to see why.`,
        action: 'See my status',
        href: STATUS,
        starts: false,
      };
    default:
      return {
        kind,
        title: 'Verify to connect',
        body: investor
          ? 'Everyone you meet here has been checked. Verify once to see who the founders are, ask to join them and chat.'
          : 'Everyone you meet here has been checked. Verify once to see investor names, ask them to connect and chat.',
        action: 'Start verification',
        href: '/founder/verify',
        starts: true,
      };
  }
}
