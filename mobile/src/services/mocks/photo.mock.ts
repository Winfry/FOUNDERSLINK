import type { PhotoService } from '../http/photo.http';
import { mockDelay } from './delay';
import { getMemberById } from './mock-store';
import { getMockSessionUserId } from './mock-session';

/** The demo keeps her photo where it was picked, for as long as the app is open. */
export const mockPhotoService: PhotoService = {
  async upload(localUri) {
    await mockDelay(400);
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (member) member.user.avatarUrl = localUri;
    return localUri;
  },

  async remove() {
    await mockDelay(200);
    const uid = getMockSessionUserId();
    const member = uid ? getMemberById(uid) : null;
    if (member) member.user.avatarUrl = undefined;
  },
};
