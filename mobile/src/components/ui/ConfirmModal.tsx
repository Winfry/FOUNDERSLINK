import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { Button } from './Button';

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button title={cancelLabel} variant="secondary" onPress={onCancel} style={styles.btn} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              loading={loading}
              onPress={onConfirm}
              style={styles.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: spacing[3],
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  message: { fontSize: 15, color: colors.textMuted, marginBottom: spacing[3] },
  actions: { flexDirection: 'row', gap: spacing[1] },
  btn: { flex: 1 },
});
