import type { ComponentType, ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';

// A faint photo behind a whole screen: people at work, washed almost to
// white so cards and text keep their contrast. The screen's own root must
// be transparent for it to show.
const PHOTO_STRENGTH = 0.08;

export function ScreenBackdrop({ children }: { children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <Image
        source={require('../../../assets/images/background-all.jpg')}
        style={styles.photo}
        resizeMode="cover"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {children}
    </View>
  );
}

// For a tab screen: `export default withBackdrop(MatchesScreen)`.
export function withBackdrop<P extends object>(Screen: ComponentType<P>) {
  function WithBackdrop(props: P) {
    return (
      <ScreenBackdrop>
        <Screen {...props} />
      </ScreenBackdrop>
    );
  }
  WithBackdrop.displayName = `WithBackdrop(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return WithBackdrop;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  photo: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', opacity: PHOTO_STRENGTH },
});
