import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Avatar, Button, Card, useToast } from '../ui';
import { Text } from '../ui/Text';
import { photoService } from '../../services';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme/tokens';

// Big enough to fill an investor's page on a phone, small enough to send quickly.
const SIZE = 800;

/**
 * Her photo: a face to put to her business. Optional. She chooses one or
 * takes a selfie, crops it square, and it is made small before it is sent.
 * It is shown to verified members wherever her name is shown.
 */
export function ProfilePhoto() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const toast = useToast();
  const [busy, setBusy] = useState<'saving' | 'removing' | null>(null);
  const has = Boolean(user?.avatarUrl);

  const pick = async (from: 'library' | 'camera') => {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 };
    if (from === 'camera') {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) {
        toast.show('To take a photo, allow FoundersLink to use the camera in your phone settings.', 'error');
        return;
      }
    }
    const picked = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset) return;

    setBusy('saving');
    try {
      // Square, and no bigger than it needs to be.
      const side = Math.min(asset.width || SIZE, asset.height || SIZE);
      const context = ImageManipulator.manipulate(asset.uri);
      if (asset.width && asset.height && asset.width !== asset.height) {
        context.crop({ originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side });
      }
      if (side > SIZE) context.resize({ width: SIZE, height: SIZE });
      const small = await (await context.renderAsync()).saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
      const shown = await photoService.upload(small.uri);
      await patchUser({ avatarUrl: shown });
      toast.show(has ? 'Your photo is changed.' : 'Your photo is added.', 'success');
    } catch (e) {
      toast.show((e as { message?: string })?.message ?? 'We could not save your photo. Try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('removing');
    try {
      await photoService.remove();
      await patchUser({ avatarUrl: undefined });
      toast.show('Your photo is removed. Your initials are shown instead.', 'success');
    } catch (e) {
      toast.show((e as { message?: string })?.message ?? 'We could not remove your photo. Try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar name={user?.fullName ?? ''} uri={user?.avatarUrl} size={72} />
        <View style={styles.words}>
          <Text style={styles.title}>Your photo</Text>
          <Text style={styles.line}>Optional. Put a face to your name. Verified members see it wherever your name is shown.</Text>
        </View>
      </View>
      <Text style={styles.note}>A photo of you, not of your ID. FoundersLink never asks for ID documents.</Text>
      <View style={styles.actions}>
        <Button
          title={has ? 'Change photo' : 'Choose a photo'}
          variant={has ? 'secondary' : 'primary'}
          loading={busy === 'saving'}
          disabled={busy !== null}
          onPress={() => void pick('library')}
          style={styles.action}
        />
        {Platform.OS !== 'web' ? (
          <Button title="Take a photo" variant="secondary" disabled={busy !== null} onPress={() => void pick('camera')} style={styles.action} />
        ) : null}
      </View>
      {has ? <Button title="Remove photo" variant="ghost" loading={busy === 'removing'} disabled={busy !== null} onPress={() => void remove()} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[1.5] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  words: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '500', color: colors.text },
  line: { fontSize: 13, color: colors.textMuted },
  note: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  action: { flexGrow: 1 },
});
