import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../ui/Avatar';
import { chatService } from '../../services';
import type { ChatMessage } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

export function ChatPanel({ groupId }: { groupId: string }) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const page = await chatService.getMessages(groupId);
    setMessages(page.items);
  }, [groupId]);

  useEffect(() => {
    load();
    chatService.connect(groupId);
    const unsub = chatService.onMessage((msg) => {
      if (msg.groupId === groupId) setMessages((m) => [...m, msg]);
    });
    const unsubTyping = chatService.onTyping((_id, isTyping) => setTyping(isTyping));
    return () => {
      unsub();
      unsubTyping();
      chatService.disconnect();
    };
  }, [groupId, load]);

  const send = async () => {
    if (!text.trim()) return;
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      groupId,
      senderId: user?.id ?? 'me',
      senderName: 'You',
      body: text.trim(),
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((m) => [...m, optimistic]);
    setText('');
    try {
      const sent = await chatService.sendMessage(groupId, { body: optimistic.body });
      setMessages((m) => m.map((x) => (x.id === optimistic.id ? sent : x)));
    } catch {
      setMessages((m) => m.map((x) => (x.id === optimistic.id ? { ...x, status: 'failed' } : x)));
    }
  };

  return (
    <View style={styles.flex}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id || item.senderName === 'You';
          return (
            <View style={[styles.row, mine && styles.rowMine]}>
              {!mine ? <Avatar name={item.senderName} size={32} /> : null}
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                {!mine ? <Text style={styles.sender}>{item.senderName}</Text> : null}
                <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</Text>
                {item.status === 'failed' ? (
                  <Pressable onPress={send}><Text style={styles.retry}>Retry</Text></Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
      {typing ? <Text style={styles.typing}>Someone is typing…</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => {
            setText(t);
            chatService.setTyping(groupId, t.length > 0);
          }}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.send} onPress={send} accessibilityLabel="Send message">
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.grey100 },
  list: { padding: spacing[2], paddingBottom: spacing[4] },
  row: { flexDirection: 'row', marginBottom: spacing[2], gap: spacing[1], alignItems: 'flex-end' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', padding: spacing[2], borderRadius: radius.card, borderWidth: 1, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.primary, borderColor: colors.primary },
  bubbleOther: { backgroundColor: colors.white },
  sender: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
  body: { fontSize: 15, color: colors.text },
  bodyMine: { color: colors.white },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  retry: { color: colors.error, fontSize: 12, marginTop: 4 },
  typing: { paddingHorizontal: spacing[2], color: colors.textMuted, fontSize: 12 },
  inputRow: { flexDirection: 'row', padding: spacing[2], gap: spacing[1], backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, minHeight: touchTargetMin, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing[2], color: colors.text },
  send: { minHeight: touchTargetMin, justifyContent: 'center', paddingHorizontal: spacing[2], backgroundColor: colors.primary, borderRadius: radius.card },
  sendLabel: { color: colors.white, fontWeight: '600' },
});
