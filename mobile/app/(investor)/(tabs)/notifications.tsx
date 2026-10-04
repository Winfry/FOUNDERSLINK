import { withBackdrop } from '../../../src/components/ui/ScreenBackdrop';
import { NotificationsList } from '../../../src/components/notifications/NotificationsList';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../src/theme/tokens';

function InvestorNotificationsTab() {
  return (
    <View style={styles.flex}>
      <NotificationsList />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: 'transparent' } });

export default withBackdrop(InvestorNotificationsTab);
