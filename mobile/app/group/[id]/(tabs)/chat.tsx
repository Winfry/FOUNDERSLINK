import { useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ChatPanel } from '../../../../src/components/chat/ChatPanel';
import { colors } from '../../../../src/theme/tokens';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.flex}>
      <ChatPanel groupId={String(id)} />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.white } });
