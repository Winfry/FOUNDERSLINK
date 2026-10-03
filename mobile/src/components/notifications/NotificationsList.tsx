import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SectionList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../ui/Badge';
import { ScreenEmpty, ScreenLoading } from '../layout/ScreenStates';
import { notificationService } from '../../services';
import type { AppNotification } from '../../types';
import { colors, spacing } from '../../theme/tokens';

function groupNotifications(items: AppNotification[]) {
  const today = new Date().toDateString();
  const todayItems = items.filter((n) => new Date(n.createdAt).toDateString() === today);
  const earlier = items.filter((n) => new Date(n.createdAt).toDateString() !== today);
  const sections: { title: string; data: AppNotification[] }[] = [];
  if (todayItems.length) sections.push({ title: 'Today', data: todayItems });
  if (earlier.length) sections.push({ title: 'Earlier', data: earlier });
  return sections;
}

export function NotificationsList() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => notificationService.list() });

  if (q.isLoading) return <ScreenLoading />;
  if (!q.data?.length) return <ScreenEmpty title="No notifications" description="Alerts for requests, finance, and messages appear here." />;

  const sections = groupNotifications(q.data);

  const open = async (n: AppNotification) => {
    await notificationService.markRead(n.id);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    if (n.route) router.push(n.route as never);
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => open(item)}>
          {!item.read ? <View style={styles.dot} /> : null}
          <View style={styles.body}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>{item.body}</Text>
            <Badge label={item.category.replace(/_/g, ' ')} variant="muted" />
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[2], paddingTop: spacing[6] },
  section: { fontWeight: '700', color: colors.text, marginVertical: spacing[1] },
  row: { flexDirection: 'row', gap: spacing[2], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  body: { flex: 1, gap: 4 },
  title: { fontWeight: '600', color: colors.text },
  sub: { color: colors.textMuted, fontSize: 14 },
});
