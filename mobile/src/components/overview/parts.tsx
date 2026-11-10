import type { ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useWideLayout } from '../../hooks/useWideLayout';
import { colors, radius, shadows, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';
import { Illustration, type IllustrationName } from '../illustrations/People';

type Icon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

/**
 * "Good morning, Amina", a line about today, and the one next step. On a
 * computer it is a welcome card with a drawing of people for the role; on
 * a phone it stays compact, so the numbers are still in view.
 */
export function Greeting({ eyebrow, title, line, action, art }: { eyebrow: string; title: string; line: string; action?: ReactNode; art?: IllustrationName }) {
  const wide = useWideLayout();
  if (wide) {
    return (
      <View style={[styles.card, styles.welcome]}>
        <View style={[styles.flex, styles.welcomeWords]}>
          <Text style={styles.hello} accessibilityRole="header">{title}</Text>
          <Text style={styles.helloLine}>{line}</Text>
          {action ? <View style={styles.welcomeAction}>{action}</View> : null}
        </View>
        {art ? <Illustration name={art} width={230} /> : null}
      </View>
    );
  }
  return (
    <View style={styles.greeting}>
      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.hello} accessibilityRole="header">{title}</Text>
        <Text style={styles.helloLine}>{line}</Text>
      </View>
      {action ? <View style={styles.greetingAction}>{action}</View> : null}
    </View>
  );
}

/** The numbers that matter, two across on a phone and four on a computer. */
export function Stats({ children }: { children: ReactNode }) {
  return <View style={styles.stats}>{children}</View>;
}

export function Stat({ label, value, note, icon: Icon, onPress }: { label: string; value: string; note: string; icon: Icon; onPress?: () => void }) {
  const wide = useWideLayout();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}. ${note}`}
      style={({ pressed }) => [styles.card, styles.stat, wide ? styles.statWide : styles.statPhone, pressed && styles.pressed]}
    >
      <View style={styles.statTop}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statIcon}>
          <Icon size={16} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </Pressable>
  );
}

/** Two columns on a computer (wider one first), one on a phone. */
export function Columns({ children }: { children: ReactNode }) {
  const wide = useWideLayout();
  return <View style={wide ? styles.columns : styles.stack}>{children}</View>;
}

export function Column({ children, wide: wider }: { children: ReactNode; wide?: boolean }) {
  const isWide = useWideLayout();
  return <View style={isWide ? (wider ? styles.colWide : styles.colNarrow) : styles.stack}>{children}</View>;
}

/** A white card with a title, a short line under it, and a link to the full page. */
export function Panel({
  title,
  sub,
  link,
  onLink,
  children,
  style,
}: {
  title: string;
  sub?: string;
  link?: string;
  onLink?: () => void;
  children: ReactNode;
  style?: ViewStyle;
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
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

export type Tone = 'done' | 'todo' | 'waiting' | 'new';
const TONE: Record<Tone, { bg: string; fg: string }> = {
  done: { bg: colors.successLight, fg: colors.success },
  todo: { bg: colors.primaryLight, fg: colors.primary },
  waiting: { bg: colors.accentLight, fg: colors.accentText },
  new: { bg: colors.accent, fg: colors.primaryDark },
};

export function Tag({ label, tone }: { label: string; tone: Tone }) {
  return (
    <View style={[styles.tag, { backgroundColor: TONE[tone].bg }]}>
      <Text style={[styles.tagText, { color: TONE[tone].fg }]}>{label}</Text>
    </View>
  );
}

/** One line in a list: an icon or initials, two lines of text, and a tag or a score. */
export function Row({
  icon: Icon,
  initials,
  title,
  line,
  right,
  onPress,
  last,
}: {
  icon?: Icon;
  initials?: string;
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
      <View style={[styles.rowIcon, initials ? styles.rowInitials : null]}>
        {Icon ? <Icon size={18} color={colors.primary} /> : <Text style={styles.initialsText}>{initials}</Text>}
      </View>
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

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const kes = (n: number) => `KSh ${Math.round(n).toLocaleString('en-KE')}`;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  greeting: { gap: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[2] },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2], paddingLeft: spacing[4], paddingRight: spacing[3], marginTop: spacing[2], backgroundColor: colors.white },
  welcomeWords: { gap: spacing[0.5] },
  welcomeAction: { flexDirection: 'row', marginTop: spacing[2] },
  greetingAction: { alignSelf: 'stretch' },
  eyebrow: { fontSize: 12, fontWeight: '800', color: colors.primary },
  hello: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: spacing[0.5] },
  helloLine: { fontSize: 16, color: colors.textMuted, marginTop: spacing[0.5] },

  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    ...shadows.md,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  stat: { padding: spacing[2], gap: 2 },
  statPhone: { flexBasis: '47%', flexGrow: 1 },
  statWide: { flexBasis: '22%', flexGrow: 1 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[1] },
  statLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  statIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: spacing[1] },
  statNote: { fontSize: 13, color: colors.textMuted },

  stack: { gap: spacing[2] },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  colWide: { flex: 1.5, gap: spacing[2], minWidth: 0 },
  colNarrow: { flex: 1, gap: spacing[2], minWidth: 0 },

  panel: { paddingHorizontal: 20, paddingVertical: spacing[2], gap: spacing[1] },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5], marginBottom: spacing[0.5] },
  panelTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  panelSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  linkPress: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },

  track: { height: 8, borderRadius: 99, backgroundColor: colors.grey100, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },

  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  tagText: { fontSize: 12, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: spacing[1.5] },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.grey100, alignItems: 'center', justifyContent: 'center' },
  rowInitials: { backgroundColor: colors.primaryLight },
  initialsText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowLineText: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  empty: { fontSize: 14, color: colors.textMuted, paddingVertical: spacing[1] },
});
