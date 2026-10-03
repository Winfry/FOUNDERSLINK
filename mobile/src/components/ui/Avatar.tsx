import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../theme/tokens';

export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={`${name} avatar`}
      />
    );
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.primaryDark, fontWeight: '700' },
});
