import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';

// The page behind a tab screen. The approved design keeps it plain (no
// photo behind the cards), so cards and text have their full contrast.
export function ScreenBackdrop({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
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
  screen: { flex: 1, backgroundColor: colors.background },
});
