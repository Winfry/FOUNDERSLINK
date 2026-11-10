import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme/tokens';

/**
 * The title at the top of every tab (Matches, Readiness, Network, Chamas,
 * Notifications, and the investor's tabs), so each one sits the same
 * distance under the top bar, in the same size, on a phone and in a browser.
 * The screen around it gives the side padding.
 */
export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.words}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[1.5] },
  words: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '500', color: colors.textMuted, marginTop: spacing[0.5] },
});
