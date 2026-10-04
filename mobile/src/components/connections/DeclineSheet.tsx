import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { BottomSheet, Button, Textarea } from '../ui';
import { colors, spacing } from '../../theme/tokens';

// She says why in her own words, or says nothing. No reason is written for her.
export function DeclineSheet({
  visible,
  investorName,
  reason,
  onChangeReason,
  onDecline,
  onClose,
  loading,
}: {
  visible: boolean;
  investorName: string;
  reason: string;
  onChangeReason: (value: string) => void;
  onDecline: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <BottomSheet visible={visible} title={`Decline ${investorName}'s request?`} onClose={onClose}>
      <View style={styles.wrap}>
        <Textarea
          label="Tell them why, if you like"
          value={reason}
          onChangeText={onChangeReason}
          maxLength={300}
          editable={!loading}
          style={styles.input}
        />
        <Text style={styles.hint}>They see your words as you wrote them. Leave it empty to give no reason.</Text>
        <Button title="Decline" onPress={onDecline} disabled={loading} loading={loading} />
        <Button title="Keep the request" variant="ghost" onPress={onClose} disabled={loading} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[1.5] },
  input: { minHeight: 88 },
  hint: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginTop: -spacing[1] },
});
