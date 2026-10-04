import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { colors, spacing, touchTargetMin } from '../../theme/tokens';

/**
 * The one layout every signed-out screen uses: a way back, the logo
 * mark, one heading, one helper line, then the form.
 */
export function AuthShell({
  title,
  helper,
  onBack,
  children,
}: {
  title: string;
  helper?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing[1], paddingBottom: insets.bottom + spacing[4] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.top}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
              <ChevronLeft size={24} color={colors.primaryDark} />
            </Pressable>
          ) : null}
        </View>
        <Image
          source={require('../../../assets/images/logo-mark.png')}
          style={styles.mark}
          resizeMode="contain"
          accessibilityLabel="FoundersLink"
        />
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {helper ? <Text style={styles.helper}>{helper}</Text> : null}
        <View style={styles.form}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, paddingHorizontal: spacing[3] },
  // Kept even without a back button, so the mark sits at the same height on every screen.
  top: { minHeight: touchTargetMin, justifyContent: 'center' },
  back: { width: touchTargetMin, height: touchTargetMin, justifyContent: 'center', marginLeft: -spacing[1] },
  mark: { width: 57, height: 48, marginTop: spacing[1], marginBottom: spacing[3] },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  helper: { fontSize: 16, color: colors.textMuted, marginTop: spacing[1] },
  form: { marginTop: spacing[3] },
});
