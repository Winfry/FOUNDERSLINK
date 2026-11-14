import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useWideLayout } from '../../hooks/useWideLayout';
import { colors, spacing } from '../../theme/tokens';

/**
 * The title at the top of every tab, as in the approved design. On a
 * computer: a large, light heading in deep purple, a line under it, and any
 * actions on the right. On a phone: white on the deep purple band that runs
 * on from the top bar, edge to edge (the screen around it pads 16 a side).
 */
export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const wide = useWideLayout();
  if (wide) {
    return (
      <View style={styles.wide}>
        <View style={styles.words}>
          <Text style={styles.wideTitle} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.wideSub}>{subtitle}</Text> : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    );
  }
  return (
    <View style={styles.band}>
      <View style={styles.words}>
        <Text style={styles.bandTitle} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.bandSub}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  words: { flex: 1 },
  wide: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], paddingBottom: spacing[2] },
  wideTitle: { fontSize: 40, color: colors.primaryDark },
  wideSub: { fontSize: 14, color: colors.textMuted, marginTop: spacing[1] },
  band: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    backgroundColor: colors.primaryDark,
    marginHorizontal: -spacing[2],
    paddingHorizontal: spacing[2] + 4,
    paddingTop: spacing[1],
    paddingBottom: 22,
    marginBottom: spacing[2],
  },
  bandTitle: { fontSize: 24, color: colors.white },
  bandSub: { fontSize: 13, color: colors.onDarkMuted, marginTop: 4 },
});
