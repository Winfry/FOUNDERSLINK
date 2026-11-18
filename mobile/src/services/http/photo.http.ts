import { Platform } from 'react-native';
import { photoUri } from '../../lib/photo-url';
import { del, put } from './client';

/**
 * A member's own photo: a face to put to a business. Optional, and a photo
 * of her, never of an ID. Her photo is shown wherever her name is, so while
 * her name is hidden (not yet verified) so is her face.
 */
export interface PhotoService {
  /** Sends a photo (already cropped square and made small), and returns where it is now shown from. */
  upload(localUri: string): Promise<string | undefined>;
  remove(): Promise<void>;
}

export const httpPhotoService: PhotoService = {
  async upload(localUri) {
    const form = new FormData();
    if (Platform.OS === 'web') {
      // In a browser the picked photo is a blob: or data: address.
      const blob = await (await fetch(localUri)).blob();
      form.append('photo', blob, 'photo.jpg');
    } else {
      // React Native sends a file by describing where it is.
      form.append('photo', { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
    }
    const saved = await put<{ photo_url: string }>('/me/photo', form);
    return photoUri(saved.photo_url);
  },

  async remove() {
    await del('/me/photo');
  },
};
