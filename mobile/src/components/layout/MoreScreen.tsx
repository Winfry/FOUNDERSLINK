import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { Sidebar } from './Sidebar';

/**
 * The phone's "More" tab: the side menu from the computer, as a whole page
 * in the same deep purple, so every place on the side menu (Messages,
 * Network, Chamas, the Co-pilot, Notifications, Settings, her profile) can
 * be reached on a phone too. On a computer the side menu is always there.
 */
export function MoreScreen() {
  return (
    <View style={styles.page}>
      <Sidebar fill />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.primaryDark },
});
