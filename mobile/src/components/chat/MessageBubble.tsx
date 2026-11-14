import { Pressable, StyleSheet, View } from 'react-native';
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
 * One message. Hers sit on the right in purple, other people's on the left
 * in white with a hairline border, the system's in the middle. A money
 * warning ("Careful") sits above the message it is about. Other people's
 * messages carry a small "More" control that opens Report and Block.
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
          <Text style={styles.warningLabel}>Careful</Text>
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
            // A full 44-point target: browsers ignore the extra touch area (hitSlop).
            style={({ pressed }) => [styles.more, styles.moreTarget, pressed && styles.morePressed]}
          >
            <Text style={styles.moreText}>More</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.time, mine && styles.timeMine]}>{messageTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  moreTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  wrap: { maxWidth: '86%', gap: 4 },
  wrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },

  sender: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginLeft: spacing[1.5] },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  bubble: { flexShrink: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  bubbleFlagged: { borderWidth: 1, borderColor: colors.accent },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  bodyMine: { color: colors.white },

  more: { paddingHorizontal: spacing[1], borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  morePressed: { backgroundColor: colors.primaryLight },

  time: { fontSize: 12, color: colors.textMuted, marginLeft: spacing[1.5] },
  timeMine: { marginLeft: 0, marginRight: spacing[0.5] },

  warning: {
    gap: 4,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    padding: spacing[1.5],
    marginBottom: 4,
  },
  warningLabel: { fontSize: 12, fontWeight: '600', color: colors.accentText },
  warningText: { fontSize: 14, color: colors.text },

  systemWrap: { alignSelf: 'center', alignItems: 'center', maxWidth: '90%', gap: 4 },
  system: { backgroundColor: colors.primaryLight, borderRadius: 99, paddingHorizontal: spacing[1.5], paddingVertical: 6 },
  systemText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
