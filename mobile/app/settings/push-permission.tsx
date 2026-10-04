import { StyleSheet, View } from 'react-native';
import { BellRing } from 'lucide-react-native';
import { Button } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { Note, SettingsPage, useSettingsBack } from '../../src/components/settings/SettingsPage';
import { colors, spacing } from '../../src/theme/tokens';

export default function PushPermissionScreen() {
  const back = useSettingsBack();
  const { show } = useToast();
  return (
    <SettingsPage
      title="Push alerts"
      heading="Hear about it straight away"
      intro="Push alerts tell you when an investor answers, a message arrives or a deal moves to its next step."
    >
      <View style={styles.badge}>
        <BellRing size={32} color={colors.primary} />
      </View>
      <Note>Push alerts are not switched on in this demo yet. For now your updates wait for you in the app, or come by SMS if you chose that.</Note>
      <View style={styles.actions}>
        <Button
          title="Turn on push alerts"
          onPress={() => {
            show('Push alerts are not available in this demo yet', 'error');
            back();
          }}
        />
        <Button title="Not now" variant="ghost" onPress={back} />
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  badge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: spacing[1], marginTop: spacing[1] },
});
