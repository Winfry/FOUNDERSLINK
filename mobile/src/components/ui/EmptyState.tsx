import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '../../theme/tokens';
import { Button } from './Button';
import type { LucideIcon } from 'lucide-react-native';
import { Illustration, type IllustrationName } from '../illustrations/People';

/**
 * What a screen shows when there is nothing in it yet: a friendly drawing
 * of people (or an icon), what is missing, and the one thing to do next.
 */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  illustration?: IllustrationName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {illustration ? (
        <Illustration name={illustration} width={210} />
      ) : Icon ? (
        <Icon size={40} color={colors.textMuted} strokeWidth={1.5} />
      ) : null}
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: spacing[1] },
  desc: { fontSize: 15, color: colors.textMuted, textAlign: 'center', maxWidth: 360 },
  btn: { marginTop: spacing[2], alignSelf: 'stretch', maxWidth: 360, width: '100%' },
});
