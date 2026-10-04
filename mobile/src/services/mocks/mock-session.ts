let activeUserId: string | null = null;

export function setMockSessionUserId(userId: string | null) {
  activeUserId = userId;
}

export function getMockSessionUserId() {
  return activeUserId;
}
