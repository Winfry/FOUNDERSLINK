import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, touchTargetMin } from '../../theme/tokens';

export function Header({
  title,
  subtitle,
  onBack,
  right,
  insetX,
}: {
  /** Extra side space, to line the title up with a page centred on a computer. */
  insetX?: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing[1] }, insetX ? { paddingHorizontal: insetX + spacing[2] } : null]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : (
          null
        )}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  back: {
    minHeight: touchTargetMin,
    justifyContent: 'center',
    paddingRight: spacing[2],
  },
  backText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  titles: { flex: 1 },
  title: { fontSize: 17, fontWeight: '500', color: colors.primaryDark },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  right: { minWidth: touchTargetMin, alignItems: 'flex-end' },
});
