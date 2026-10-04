import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

// The top bar's background: navy with a faint diamond pattern, after the
// beadwork found across Kenya, and a thin beaded stripe along the bottom
// edge in the brand colours. Kept faint so the bar's text and icons stay
// the first thing you see.
export function HeaderPattern() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="fl-beads" width={28} height={28} patternUnits="userSpaceOnUse">
            <Path d="M14 5 L20 14 L14 23 L8 14 Z" fill={colors.white} opacity={0.07} />
            <Path d="M0 0 L3 4 L0 8 Z M28 20 L25 24 L28 28 Z" fill={colors.white} opacity={0.05} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={colors.primaryDark} />
        <Rect width="100%" height="100%" fill="url(#fl-beads)" />
      </Svg>
      <Svg width="100%" height={4} style={styles.stripe}>
        <Defs>
          <Pattern id="fl-stripe" width={18} height={4} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={6} height={4} fill={colors.accent} />
            <Rect x={6} y={0} width={6} height={4} fill={colors.white} opacity={0.85} />
            <Rect x={12} y={0} width={6} height={4} fill={colors.primary} />
          </Pattern>
        </Defs>
        <Rect width="100%" height={4} fill="url(#fl-stripe)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: colors.primaryDark },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
