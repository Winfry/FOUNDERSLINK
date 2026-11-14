import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { portraitFor } from '../../lib/portraits';
import { colors, shadows } from '../../theme/tokens';

export function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * A person: their photo when there is one, otherwise their initials in a
 * lavender circle. A white ring and a soft shadow lift it off the page.
 * `ring={false}` drops the ring, for a face inside a dense row.
 */
export function Avatar({ name, uri, size = 40, ring = true }: { name: string; uri?: string; size?: number; ring?: boolean }) {
  const circle = [styles.circle, ring && styles.ring, { width: size, height: size, borderRadius: size / 2 }];
  if (uri) {
    return (
      <View style={circle}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} accessibilityLabel={name} />
      </View>
    );
  }
  const portrait = portraitFor(name);
  if (portrait) {
    const w = size * portrait.k;
    const h = (w * portrait.height) / portrait.width;
    return (
      <View style={circle} accessible accessibilityLabel={name}>
        <Image
          source={portrait.source}
          style={{ position: 'absolute', width: w, height: h, left: size / 2 - portrait.fx * w, top: size / 2 - portrait.fy * h }}
        />
      </View>
    );
  }
  return (
    <View style={circle} accessible accessibilityLabel={name}>
      <Text style={[styles.initials, { fontSize: Math.max(12, Math.round(size * 0.34)) }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: { borderWidth: 2, borderColor: colors.white, ...shadows.md },
  initials: { color: colors.primary, fontWeight: '500', letterSpacing: 0.3 },
});
