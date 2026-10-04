import { Pressable, StyleSheet, View } from 'react-native';
import { Ellipsis, TriangleAlert } from 'lucide-react-native';
import { Text } from '../ui/Text';
import type { ChatMessage } from '../../types';
import { colors, spacing } from '../../theme/tokens';

export function messageTime(at: string) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}, ${time}`;
}

/**
 * One message. Hers sit on the right in blue, other people's on the left
 * in grey, the system's in the middle. A money warning sits above the
 * message it is about. Other people's messages carry a small "more"
 * control that opens Report and Block.
 */
export function MessageBubble({
  message,
  mine,
  showSender,
  onMore,
}: {
  message: ChatMessage;
  mine: boolean;
  showSender: boolean;
  onMore?: () => void;
}) {
  if (message.kind === 'system') {
    return (
      <View style={styles.systemWrap}>
        <View style={styles.system}>
          <Text style={styles.systemText}>{message.body}</Text>
        </View>
        <Text style={styles.time}>{messageTime(message.createdAt)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapTheirs]}>
      {message.warningText ? (
        <View style={styles.warning} accessibilityRole="alert">
          <TriangleAlert size={18} color={colors.warning} style={styles.warningIcon} />
          <Text style={styles.warningText}>{message.warningText}</Text>
        </View>
      ) : null}
      {showSender && !mine && message.senderName ? <Text style={styles.sender}>{message.senderName}</Text> : null}
      <View style={styles.bubbleRow}>
        <Pressable
          // Long-press also opens the actions, on a phone.
          onLongPress={onMore}
          disabled={!onMore}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, message.warningText ? styles.bubbleFlagged : null]}
        >
          <Text style={[styles.body, mine && styles.bodyMine]}>{message.body}</Text>
        </Pressable>
        {onMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More actions for this message from ${message.senderName ?? 'this member'}`}
            onPress={onMore}
            hitSlop={8}
            style={({ pressed }) => [styles.more, pressed && styles.morePressed]}
          >
            <Ellipsis size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.time, mine && styles.timeMine]}>{messageTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '86%', gap: 4 },
  wrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },

  sender: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginLeft: spacing[1.5] },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  bubble: { flexShrink: 1, paddingHorizontal: spacing[1.5] + 2, paddingVertical: 10, borderRadius: 20 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.grey100, borderBottomLeftRadius: 6 },
  bubbleFlagged: { borderWidth: 1, borderColor: colors.warning },
  body: { fontSize: 16, color: colors.text },
  bodyMine: { color: colors.white },

  more: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  morePressed: { backgroundColor: colors.grey100 },

  time: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginLeft: spacing[1.5] },
  timeMine: { marginLeft: 0, marginRight: spacing[0.5] },

  warning: {
    flexDirection: 'row',
    gap: spacing[1],
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: spacing[1.5],
    marginBottom: 4,
  },
  warningIcon: { marginTop: 1 },
  warningText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },

  systemWrap: { alignSelf: 'center', alignItems: 'center', maxWidth: '90%', gap: 4 },
  system: { backgroundColor: colors.grey100, borderRadius: 12, paddingHorizontal: spacing[1.5], paddingVertical: 6 },
  systemText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
