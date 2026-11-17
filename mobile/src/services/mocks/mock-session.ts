let activeUserId: string | null = null;

export function setMockSessionUserId(userId: string | null) {
  activeUserId = userId;
}

export function getMockSessionUserId() {
  return activeUserId;
}

// The demo's sample messages, requests and notifications belong to the demo
// accounts (Amina, Grace, Wanjiku). A new account starts with an empty
// inbox, as a real new member does.
const SAMPLE_ACCOUNTS = new Set(['u-amina', 'inv-savanna', 'exp-wanjiku']);
export const hasSampleInbox = () => activeUserId !== null && SAMPLE_ACCOUNTS.has(activeUserId);
