import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { PhoneBand } from '../overview/parts';
import { useWideLayout } from '../../hooks/useWideLayout';
import { colors, spacing } from '../../theme/tokens';

/**
 * The title at the top of every tab, as in the approved design: white on
 * the deep purple band that runs edge to edge, the same on a phone and on
 * a computer (larger there). The screen around it pads its sides; the band
 * reaches past that padding.
 */
export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const wide = useWideLayout();
  return (
    <View style={styles.gap}>
      <PhoneBand>
        <View style={styles.row}>
          <View style={styles.words}>
            <Text style={[styles.title, wide && styles.titleWide]} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          </View>
          {right ? <View>{right}</View> : null}
        </View>
      </PhoneBand>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { marginBottom: spacing[1] },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  words: { flex: 1 },
  title: { fontSize: 24, color: colors.white },
  titleWide: { fontSize: 40 },
  sub: { fontSize: 13, color: colors.onDarkMuted, marginTop: 4 },
});
