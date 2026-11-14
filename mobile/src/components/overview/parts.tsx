import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useWideLayout } from '../../hooks/useWideLayout';
import { colors, radius, shadows, spacing } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';

/**
 * The parts every home screen is built from, in the approved design:
 * a greeting in large light type, numbers in quiet white cards, white
 * panels with a title and a text link, rows with a person's photo or
 * initials, and statuses in words. No icons and no drawings.
 */

const today = () =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * "Good evening, Amina." On a computer it is the page's heading, with a
 * line under it and the actions on the right. On a phone it sits on a deep
 * purple band that runs on from the top bar, with today's date above it.
 */
export function Greeting({ hello, name, line, actions }: { hello: string; name?: string; line?: string; actions?: ReactNode }) {
  const wide = useWideLayout();
  if (wide) {
    return (
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.headTitle} accessibilityRole="header">
            {hello}
            {name ? <Text style={[styles.headTitle, styles.name]}>{` ${name}.`}</Text> : null}
          </Text>
          {line ? <Text style={styles.headLine}>{today()} · {line}</Text> : null}
        </View>
        {actions ? <View style={styles.headActions}>{actions}</View> : null}
      </View>
    );
  }
  return (
    <PhoneBand>
      <Text style={styles.bandDate}>{today()}</Text>
      <Text style={styles.bandHello} accessibilityRole="header">
        {hello}
        {name ? <Text style={[styles.bandHello, styles.name]}>{` ${name}.`}</Text> : null}
      </Text>
      {line ? <Text style={styles.bandLine}>{line}</Text> : null}
    </PhoneBand>
  );
}

/** The deep purple band under the phone's top bar, edge to edge. */
export function PhoneBand({ children }: { children: ReactNode }) {
  return <View style={styles.band}>{children}</View>;
}

/** The numbers that matter: four across on a computer, two on a phone. */
export function Stats({ children }: { children: ReactNode }) {
  return <View style={styles.stats}>{children}</View>;
}

export function Stat({ label, value, of, note, onPress }: { label: string; value: string; of?: string; note?: string; onPress?: () => void }) {
  const wide = useWideLayout();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}${of ? ` ${of}` : ''}. ${note ?? ''}`}
      style={({ pressed }) => [styles.card, styles.stat, wide ? styles.statWide : styles.statPhone, pressed && styles.pressed]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        {of ? <Text style={styles.statOf}>{` ${of}`}</Text> : null}
      </Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </Pressable>
  );
}

/** Two columns on a computer (the wider first), one on a phone. */
export function Columns({ children }: { children: ReactNode }) {
  const wide = useWideLayout();
  return <View style={wide ? styles.columns : styles.stack}>{children}</View>;
}

export function Column({ children, wide: wider }: { children: ReactNode; wide?: boolean }) {
  const isWide = useWideLayout();
  return <View style={isWide ? (wider ? styles.colWide : styles.colNarrow) : styles.stack}>{children}</View>;
}

/** A white panel: a title, an optional line under it, a text link on the right. */
export function Panel({
  title,
  sub,
  link,
  onLink,
  aside,
  children,
  style,
}: {
  title: string;
  sub?: string;
  link?: string;
  onLink?: () => void;
  /** Quiet text on the right instead of a link, e.g. "About a week". */
  aside?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, styles.panel, style]}>
      <View style={styles.panelHead}>
        <View style={styles.flex}>
          <Text style={styles.panelTitle}>{title}</Text>
          {sub ? <Text style={styles.panelSub}>{sub}</Text> : null}
        </View>
        {link && onLink ? (
          <Pressable onPress={onLink} accessibilityRole="link" style={styles.linkPress}>
            <Text style={styles.link}>{link}</Text>
          </Pressable>
        ) : aside ? (
          <Text style={styles.aside}>{aside}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export type Tone = 'done' | 'todo' | 'waiting' | 'new' | 'late' | 'quiet';
const TONE: Record<Tone, { bg: string; fg: string }> = {
  done: { bg: colors.successLight, fg: colors.success },
  todo: { bg: colors.primaryLight, fg: colors.primary },
  waiting: { bg: colors.accentLight, fg: colors.accentText },
  new: { bg: colors.accent, fg: colors.primaryDark },
  late: { bg: colors.errorLight, fg: colors.error },
  quiet: { bg: colors.grey100, fg: colors.textMuted },
};

/** A status in words: "Strong fit", "Done", "Not yet". */
export function Tag({ label, tone }: { label: string; tone: Tone }) {
  return (
    <View style={[styles.tag, { backgroundColor: TONE[tone].bg }]}>
      <Text style={[styles.tagText, { color: TONE[tone].fg }]}>{label}</Text>
    </View>
  );
}

/** One line in a list: a person (photo or initials), two lines of text, and something on the right. */
export function Row({
  person,
  title,
  line,
  right,
  onPress,
  last,
}: {
  /** The name to show a face for. Leave out for a row about a thing. */
  person?: string;
  title: string;
  line?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}
    >
      {person ? <Avatar name={person} size={40} /> : null}
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={2}>{title}</Text>
        {line ? <Text style={styles.rowLineText} numberOfLines={2}>{line}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

export { initialsOf } from '../ui/Avatar';

export const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85 },

  head: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[3], marginBottom: spacing[1] },
  headTitle: { fontSize: 40, color: colors.primaryDark },
  name: { fontWeight: '500' },
  headLine: { fontSize: 14, color: colors.textMuted, marginTop: spacing[1] },
  headActions: { flexDirection: 'row', gap: 10 },

  band: {
    backgroundColor: colors.primaryDark,
    marginHorizontal: -spacing[2],
    paddingHorizontal: spacing[2] + 4,
    paddingTop: spacing[1],
    paddingBottom: 22,
    marginBottom: spacing[0.5],
  },
  bandDate: { fontSize: 12, color: colors.onDarkDim },
  bandHello: { fontSize: 28, color: colors.white, marginTop: 4 },
  bandLine: { fontSize: 13, color: colors.onDarkMuted, marginTop: 6 },

  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    ...shadows.sm,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  stat: { paddingVertical: 18, paddingHorizontal: 20 },
  statPhone: { flexBasis: '46%', flexGrow: 1 },
  statWide: { flexBasis: '22%', flexGrow: 1 },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statValue: { fontSize: 34, fontWeight: '400', color: colors.primary, marginTop: 10, lineHeight: 36 },
  statOf: { fontSize: 17, color: colors.textDim },
  statNote: { fontSize: 13, color: colors.textMuted, marginTop: 8 },

  stack: { gap: spacing[1.5] },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  colWide: { flex: 1.9, gap: 18, minWidth: 0 },
  colNarrow: { flex: 1, gap: 18, minWidth: 0 },

  panel: { padding: 22 },
  panelHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[1.5], marginBottom: spacing[1.5] },
  panelTitle: { fontSize: 16, fontWeight: '500', color: colors.primaryDark },
  panelSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  linkPress: { minHeight: 28, justifyContent: 'center' },
  link: { fontSize: 13, color: colors.textMuted },
  aside: { fontSize: 12, color: colors.textMuted },

  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  tagText: { fontSize: 12, fontWeight: '500' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: 13 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { fontSize: 14, color: colors.text },
  rowLineText: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  empty: { fontSize: 14, color: colors.textMuted, paddingVertical: spacing[1] },
});
