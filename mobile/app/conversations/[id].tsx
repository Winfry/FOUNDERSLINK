import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ban, Flag, MessageCircle, SendHorizontal } from 'lucide-react-native';
import { Text, TextInput } from '../../src/components/ui/Text';
import { BottomSheet } from '../../src/components/ui';
import { ScreenError, ScreenLoading } from '../../src/components/layout/ScreenStates';
import { useToast } from '../../src/components/ui/Toast';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { conversationService } from '../../src/services';
import { useAuthStore } from '../../src/stores/authStore';
import type { ChatMessage, ConversationSummary } from '../../src/types';
import { colors, spacing, touchTargetMin } from '../../src/theme/tokens';
import { useEffect, useRef, useState } from 'react';

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  // The message whose Report and Block actions are open.
  const [target, setTarget] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();
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

  // The header names who she is talking to, when the chat list has been seen.
  const title = qc.getQueryData<ConversationSummary[]>(['conversations'])?.find((c) => c.id === id)?.title;

  if (q.isLoading) return <ScreenLoading />;
  if (q.isError && !q.data) {
    const e = q.error as { message?: string; code?: string } | null;
    return <ScreenError message={e?.message ?? 'Check your connection and try again.'} code={e?.code} onRetry={() => void q.refetch()} />;
  }

  const items = q.data?.items ?? [];
  const canSend = body.trim().length > 0 && !sending;

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await conversationService.sendMessage(String(id), body.trim());
      setBody('');
      setInputHeight(0);
    } catch (e) {
      show((e as { message?: string })?.message ?? 'Could not send the message', 'error');
    }
    setSending(false);
    q.refetch();
  };

  const report = (item: ChatMessage) => {
    setTarget(null);
    conversationService
      .reportMessage(item.id, 'Asks for money')
      .then(() => show('Reported to FoundersLink', 'success'))
      .catch((e: { message?: string }) => show(e?.message ?? 'Could not report', 'error'));
  };

  const block = (item: ChatMessage) => {
    setTarget(null);
    conversationService
      .blockMember(item.senderId!)
      .then(() => show(`${item.senderName ?? 'This member'} can no longer message you`, 'success'))
      .catch((e: { message?: string }) => show(e?.message ?? 'Could not block', 'error'));
  };

  const toNewest = () => listRef.current?.scrollToEnd({ animated: false });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 56}
    >
      {title ? <Stack.Screen options={{ title }} /> : null}
      <FlatList
        ref={listRef}
        style={styles.flex}
        contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
        data={items}
        keyExtractor={(m) => m.id}
        // Opens at the newest message and stays there as new ones arrive.
        onContentSizeChange={toNewest}
        onLayout={toNewest}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageCircle size={32} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Say hello and tell them what you would like to talk about.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const previous = items[index - 1];
          const mine = item.senderId === me;
          // Her own messages and the system's need neither action.
          const theirs = item.kind !== 'system' && !mine;
          const newRun = !previous || previous.kind === 'system' || previous.senderId !== item.senderId;
          return (
            <View style={newRun && index > 0 ? styles.runGap : styles.sameGap}>
              <MessageBubble message={item} mine={mine} showSender={newRun} onMore={theirs ? () => setTarget(item) : undefined} />
            </View>
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: spacing[1] + insets.bottom }]}>
        <TextInput
          style={[styles.input, { height: Math.min(120, Math.max(touchTargetMin, inputHeight + 2)) }]}
          value={body}
          onChangeText={setBody}
          placeholder="Write a message"
          accessibilityLabel="Message"
          multiline
          // One line tall to start (a browser's default is two), growing with the text.
          {...({ rows: 1 } as object)}
          onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
          // In a browser Enter sends and Shift+Enter starts a new line.
          onKeyPress={(e) => {
            const key = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && key.key === 'Enter' && !key.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={() => void send()}
          style={({ pressed }) => [styles.send, !canSend && styles.sendOff, pressed && styles.sendPressed]}
        >
          <SendHorizontal size={22} color={canSend ? colors.white : colors.textMuted} />
        </Pressable>
      </View>

      <BottomSheet visible={target !== null} title={target?.senderName ?? 'This message'} onClose={() => setTarget(null)}>
        {target ? (
          <View>
            <Text style={styles.quote} numberOfLines={2}>
              {target.body}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
              onPress={() => report(target)}
            >
              <Flag size={22} color={colors.primaryDark} />
              <View style={styles.flex}>
                <Text style={styles.sheetTitle}>Report this message</Text>
                <Text style={styles.sheetHint}>FoundersLink's team will look at it.</Text>
              </View>
            </Pressable>
            {target.senderId ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.sheetRow, styles.sheetDivider, pressed && styles.sheetRowPressed]}
                onPress={() => block(target)}
              >
                <Ban size={22} color={colors.error} />
                <View style={styles.flex}>
                  <Text style={styles.sheetTitle}>Block {target.senderName ?? 'this member'}</Text>
                  <Text style={styles.sheetHint}>They will no longer be able to message you.</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  list: { paddingHorizontal: spacing[2], paddingVertical: spacing[2] },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  sameGap: { marginTop: spacing[0.5] },
  runGap: { marginTop: spacing[2] },

  empty: { alignItems: 'center', gap: spacing[1], padding: spacing[3] },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: touchTargetMin,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.grey100,
    paddingHorizontal: spacing[2],
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: colors.text,
  },
  send: {
    width: touchTargetMin,
    height: touchTargetMin,
    borderRadius: touchTargetMin / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { backgroundColor: colors.grey100 },
  sendPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.95 }] },

  quote: {
    fontSize: 14,
    color: colors.textMuted,
    backgroundColor: colors.grey100,
    borderRadius: 12,
    padding: spacing[1.5],
    marginBottom: spacing[1],
  },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], minHeight: 64, paddingVertical: spacing[1] },
  sheetRowPressed: { backgroundColor: colors.grey100 },
  sheetDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sheetHint: { fontSize: 14, color: colors.textMuted },
});
