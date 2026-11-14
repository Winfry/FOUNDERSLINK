import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '../../theme/tokens';
import { Button } from './Button';

/**
 * What a screen shows when there is nothing in it yet: what is missing,
 * in a sentence, and the one thing to do next. Words only, as in the
 * approved design (`icon` and `illustration` are accepted and ignored, so
 * older screens keep compiling).
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: unknown;
  illustration?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} variant="secondary" onPress={onAction} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[4], gap: spacing[1] },
  title: { fontSize: 24, color: colors.primaryDark, textAlign: 'center' },
  desc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 380 },
  btn: { marginTop: spacing[2], alignSelf: 'center', minWidth: 220 },
});
