import { NotificationsList } from '../../../src/components/notifications/NotificationsList';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../src/theme/tokens';

export default function FounderNotificationsTab() {
  return (
    <View style={styles.flex}>
      <NotificationsList />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.white } });
