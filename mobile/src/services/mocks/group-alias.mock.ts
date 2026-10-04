import { mockCircleService } from './circle.mock';

/** @deprecated Use circleService — alias for legacy investor group tab */
export const mockGroupAlias = {
  async listGroups() {
    const circles = await mockCircleService.list();
    return circles.map((c) => ({
      id: c.id,
      name: c.name,
      memberCount: c.memberCount,
      unreadChatCount: c.unreadChatCount,
      lastMessagePreview: undefined as string | undefined,
    }));
  },
};
