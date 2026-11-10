import { StyleSheet, View } from 'react-native';
import { NotificationsList } from '../../../src/components/notifications/NotificationsList';

// The expert's notifications, reached from the bell.
export default function ExpertNotifications() {
  return (
    <View style={styles.flex}>
      <NotificationsList />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: 'transparent' } });
