import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, radius } from '../../theme/tokens';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// A rounded track with a filled pill on the chosen side. The pill is
// orange, the colour that says "you are here"; its label is navy,
// because white or orange text on it would be too faint to read.
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text numberOfLines={1} style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.grey100,
    borderRadius: radius.full,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  segmentOn: { backgroundColor: colors.accent },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  labelOn: { fontWeight: '700', color: colors.primaryDark },
});
