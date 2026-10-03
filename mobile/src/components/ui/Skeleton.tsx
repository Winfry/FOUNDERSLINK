import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius } from '../../theme/tokens';

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: ViewStyle['width']; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[styles.base, { height, width, opacity }, style]}
      accessibilityLabel="Loading"
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} style={{ marginTop: 12 }} />
      <Skeleton height={14} width="80%" style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.grey200,
    borderRadius: radius.sm,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    marginBottom: 12,
  },
});
