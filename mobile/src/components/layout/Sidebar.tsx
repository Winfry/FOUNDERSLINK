import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { colors, radius, spacing } from '../../theme/tokens';
import { SIDEBAR_WIDTH } from '../../hooks/useWideLayout';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { isActive, workspaceFor } from './workspace';

const STATUS: Record<string, string> = {
  approved: 'Verified member',
  submitted: 'Verification in review',
  in_review: 'Verification in review',
  needs_info: 'More information needed',
  rejected: 'Not approved',
  suspended: 'Suspended',
  draft: 'Not verified yet',
};

/**
 * The side menu on a computer: the brand, the member's workspace, and who
 * is signed in. It stays put while the pages beside it change.
 */
export function Sidebar() {
  const router = useRouter();
  const path = usePathname();
  const user = useAuthStore((s) => s.user);
  const ws = workspaceFor(user?.role);
  if (!user || !ws) return null;

  return (
    <View style={styles.bar}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Image source={require('../../../assets/images/logo-mark.png')} style={styles.markImage} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.brandName}>FoundersLink</Text>
          <Text style={styles.tagline}>Connect · Comply · Grow</Text>
        </View>
      </View>

      <Text style={styles.section}>{ws.name}</Text>
      <ScrollView style={styles.flex} contentContainerStyle={styles.nav}>
        {ws.items.map((item, i) => {
          const on = isActive(item, path);
          const Icon = item.icon;
          const startsGroup = item.group && item.group !== ws.items[i - 1]?.group;
          return (
            <View key={item.href}>
            {startsGroup ? <Text style={styles.group}>{item.group}</Text> : null}
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ selected: on }}
              onPress={() => router.navigate(item.href as never)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.item,
                (on || hovered) && styles.itemOn,
                pressed && styles.itemPressed,
              ]}
            >
              <Icon size={19} color={on ? colors.white : colors.onDarkMuted} strokeWidth={on ? 2.3 : 1.9} />
              <Text style={[styles.itemText, on && styles.itemTextOn]}>{item.label}</Text>
              {on ? <View style={styles.dot} /> : null}
            </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Your profile, ${user.fullName}`}
        onPress={() => router.navigate(ws.profile as never)}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.me, hovered && styles.meHover]}
      >
        <Text style={styles.signedIn}>Signed in as</Text>
        <View style={styles.meRow}>
          <Avatar name={user.fullName} size={36} />
          <View style={styles.flex}>
            <Text style={styles.meName} numberOfLines={1}>{user.fullName}</Text>
            <Text style={styles.meStatus} numberOfLines={1}>{STATUS[user.approvalStatus] ?? ''}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.primaryDark,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[2],
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingHorizontal: spacing[1], paddingBottom: spacing[4] },
  mark: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  markImage: { width: 28, height: 24 },
  brandName: { fontSize: 18, fontWeight: '800', color: colors.white },
  tagline: { fontSize: 12, fontWeight: '600', color: colors.onDarkMuted },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onDarkMuted,
    paddingHorizontal: spacing[1],
    marginBottom: spacing[1],
  },
  nav: { gap: 4 },
  group: { fontSize: 11, fontWeight: '800', color: colors.accent, paddingHorizontal: spacing[1.5], marginTop: spacing[2], marginBottom: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    minHeight: 44,
    paddingHorizontal: spacing[1.5],
    borderRadius: radius.sm,
  },
  itemOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  itemPressed: { opacity: 0.8 },
  itemText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.onDarkMuted },
  itemTextOn: { color: colors.white, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  me: {
    borderTopWidth: 1,
    borderTopColor: colors.onDarkLine,
    paddingTop: spacing[2],
    paddingHorizontal: spacing[1],
    borderRadius: radius.sm,
    gap: spacing[1],
  },
  meHover: { backgroundColor: 'rgba(255,255,255,0.06)' },
  signedIn: { fontSize: 12, fontWeight: '700', color: colors.onDarkMuted },
  meRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingBottom: spacing[1] },
  meName: { fontSize: 14, fontWeight: '700', color: colors.white },
  meStatus: { fontSize: 12, color: colors.onDarkMuted },
});
