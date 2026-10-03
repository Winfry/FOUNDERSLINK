import { seedMobileTestingData } from '../../lib/application-store';

/** Runs once when the mobile service layer loads. */
seedMobileTestingData();

/** Quick login for manual QA (approved applications, onboarding skipped). */
export const MOBILE_TEST_CREDENTIALS = {
  founder: {
    identifier: 'wanjiku@maziwafresh.co.ke',
    userId: 'FL-FND-10001',
    password: 'DemoFounder2026!',
  },
  investor: {
    identifier: 'james.kariuki@example.com',
    userId: 'FL-INV-20482',
    password: 'DemoInvestor2026!',
  },
} as const;
