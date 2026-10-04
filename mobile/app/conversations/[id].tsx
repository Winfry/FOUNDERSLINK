import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../src/components/ui';
import { ScreenLoading } from '../../src/components/layout/ScreenStates';
import { useToast } from '../../src/components/ui/Toast';
import { conversationService } from '../../src/services';
import { colors, spacing } from '../../src/theme/tokens';
import { useState } from 'react';

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState('');
  // Asked again every few seconds, so a reply shows without leaving the screen.
  const q = useQuery({
    queryKey: ['messages', id],
    queryFn: () => conversationService.getMessages(String(id)),
    refetchInterval: 3000,
  });

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
            {item.kind !== 'system' ? (
              <Button title="Report" variant="ghost" onPress={() =>
                  conversationService
                    .reportMessage(item.id, 'Asks for money')
                    .then(() => show('Reported to FounderLink', 'success'))
                    .catch((e: { message?: string }) => show(e?.message ?? 'Could not report', 'error'))
                } />
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
