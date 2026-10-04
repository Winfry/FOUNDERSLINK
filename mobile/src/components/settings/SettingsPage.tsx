import type { ReactNode } from 'react';
import { KeyboardScroll } from '../ui/KeyboardScroll';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../layout/Header';
import { Text } from '../ui/Text';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

/** After a reload there is nothing to go back to, so back goes to Settings. */
export function useSettingsBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/settings'));
}

/** The frame every settings sub-page shares: back header, heading, intro, scrolling body. */
export function SettingsPage({
  title,
  heading,
  intro,
  children,
}: {
  title: string;
  heading: string;
  intro?: string;
  children: ReactNode;
}) {
  const back = useSettingsBack();
  return (
    <>
      <Header title={title} onBack={back} />
      <KeyboardScroll style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Text style={styles.heading}>{heading}</Text>
          {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        </View>
        {children}
      </KeyboardScroll>
    </>
  );
}

/** A titled block of the page. */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

/** A white bordered box that holds rows. */
export function RowGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

/** One row: words on the left, a control or icon on the right. */
export function Row({
  label,
  line,
  right,
  last,
}: {
  label: string;
  line?: string;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowWords}>
        <Text style={styles.rowLabel}>{label}</Text>
        {line ? <Text style={styles.rowLine}>{line}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** A row she picks one of: a round mark on the left that fills when chosen. */
export function RadioRow({
  label,
  line,
  selected,
  onPress,
  last,
}: {
  label: string;
  line?: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, last && styles.rowLast]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.rowWords}>
        <Text style={styles.rowLabel}>{label}</Text>
        {line ? <Text style={styles.rowLine}>{line}</Text> : null}
      </View>
    </Pressable>
  );
}

/** A quiet tinted note. */
export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <View style={[styles.note, tone === 'warning' && styles.noteWarning]}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white },
  content: { padding: spacing[2], paddingBottom: spacing[6], gap: spacing[3] },
  top: { gap: spacing[1] },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  intro: { fontSize: 16, fontWeight: '500', color: colors.textMuted, lineHeight: 24 },
  section: { gap: spacing[1.5] },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  group: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    minHeight: touchTargetMin + 8,
    paddingVertical: spacing[1.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowWords: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  rowLine: { fontSize: 14, fontWeight: '500', color: colors.textMuted, lineHeight: 20 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  note: { backgroundColor: colors.primaryLight, borderRadius: radius.card, padding: spacing[2] },
  noteWarning: { backgroundColor: colors.warningLight },
  noteText: { fontSize: 14, fontWeight: '500', color: colors.text, lineHeight: 20 },
});
