import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../src/components/ui';
import { ScreenLoading } from '../../src/components/layout/ScreenStates';
import { useToast } from '../../src/components/ui/Toast';
import { conversationService } from '../../src/services';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing } from '../../src/theme/tokens';
import { useEffect, useState } from 'react';

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState('');
  // Asked again every few seconds, so a reply shows without leaving the screen.
  const q = useQuery({
    queryKey: ['messages', id],
    queryFn: () => conversationService.getMessages(String(id)),
    // The live connection brings new messages at once. This is the fallback.
    refetchInterval: 15000,
  });
  const me = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  // Reading a thread clears its unread count.
  const newest = q.data?.items.at(-1)?.id;
  useEffect(() => {
    if (!newest) return;
    conversationService
      .markRead(String(id))
      .then(() => qc.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => undefined);
  }, [id, newest, qc]);

  const { show } = useToast();

  if (q.isLoading) return <ScreenLoading />;

  const send = async () => {
    if (!body.trim()) return;
    try {
      await conversationService.sendMessage(String(id), body.trim());
      setBody('');
    } catch (e) {
      show((e as { message?: string })?.message ?? 'Could not send the message', 'error');
    }
    q.refetch();
  };

  return (
    <View style={styles.flex}>
      <FlatList
        contentContainerStyle={styles.list}
        data={q.data?.items ?? []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.kind === 'system' && styles.system]}>
            {item.warningText ? <Text style={styles.warning}>{item.warningText}</Text> : null}
            {item.kind === 'system' ? null : <Text style={styles.sender}>{item.senderName}</Text>}
            <Text style={styles.body}>{item.body}</Text>
            {/* Her own messages and the system's need neither button. */}
            {item.kind !== 'system' && item.senderId !== me ? (
              <View style={styles.actions}>
                <Button
                  title="Report"
                  variant="ghost"
                  onPress={() =>
                    conversationService
                      .reportMessage(item.id, 'Asks for money')
                      .then(() => show('Reported to FounderLink', 'success'))
                      .catch((e: { message?: string }) => show(e?.message ?? 'Could not report', 'error'))
                  }
                />
                {item.senderId ? (
                  <Button
                    title="Block"
                    variant="ghost"
                    onPress={() =>
                      conversationService
                        .blockMember(item.senderId!)
                        .then(() => show(`${item.senderName ?? 'This member'} can no longer message you`, 'success'))
                        .catch((e: { message?: string }) => show(e?.message ?? 'Could not block', 'error'))
                    }
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput style={styles.input} value={body} onChangeText={setBody} placeholder="Message" />
        <Button title="Send" onPress={() => void send()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1, backgroundColor: colors.white },
  list: { padding: spacing[2], gap: spacing[2] },
  bubble: { padding: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  system: { alignSelf: 'center', backgroundColor: colors.grey100, borderWidth: 0 },
  warning: { color: colors.error, fontSize: 12, marginBottom: 4 },
  sender: { fontWeight: '600', color: colors.text, marginBottom: 4 },
  body: { color: colors.text, lineHeight: 20 },
  composer: { flexDirection: 'row', gap: 8, padding: spacing[2], borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, minHeight: 44 },
});
