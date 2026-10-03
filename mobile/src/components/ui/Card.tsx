import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme/tokens';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[2],
    ...shadows.sm,
  },
});
