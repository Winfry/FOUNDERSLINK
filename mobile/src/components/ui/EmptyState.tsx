import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { Button } from './Button';
import type { LucideIcon } from 'lucide-react-native';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {Icon ? <Icon size={40} color={colors.textMuted} strokeWidth={1.5} /> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[1],
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  desc: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  btn: { marginTop: spacing[2], alignSelf: 'stretch' },
});
