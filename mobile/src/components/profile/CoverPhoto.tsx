import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { portraitFor } from '../../lib/portraits';
import { colors } from '../../theme/tokens';

/** Whether a person has a photo to show as a cover: one they added, or a demo face. */
export function hasCover(name: string, uri?: string) {
  return Boolean(uri) || Boolean(portraitFor(name));
}

/**
 * A person's photo across the top of their page, edge to edge, with the
 * brand's purple deepening towards the bottom so their name reads over it.
 * Their own photo fills it; a demo face is framed on the face. `children`
 * sit at the bottom, over the shade.
 */
export function CoverPhoto({ name, uri, height = 340, children }: { name: string; uri?: string; height?: number; children?: ReactNode }) {
  const [width, setWidth] = useState(0);
  const portrait = uri ? undefined : portraitFor(name);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  let image: ReactNode = null;
  if (uri) {
    image = <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Photo of ${name}`} />;
  } else if (portrait && width > 0) {
    // Framed on the face: drawn large enough to cover the area, with the
    // face a third of the way down, and never leaving a gap at an edge.
    const scale = Math.max(width / portrait.width, height / portrait.height) * 1.7;
    const w = portrait.width * scale;
    const h = portrait.height * scale;
    const left = Math.min(0, Math.max(width - w, width / 2 - portrait.fx * w));
    const top = Math.min(0, Math.max(height - h, height * 0.32 - portrait.fy * h));
    image = <Image source={portrait.source} style={{ position: 'absolute', width: w, height: h, left, top }} accessibilityLabel={`Photo of ${name}`} />;
  }

  return (
    <View style={[styles.wrap, { height }]} onLayout={onLayout}>
      {image}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="cover" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#28184E" stopOpacity="0.35" />
              <Stop offset="0.38" stopColor="#28184E" stopOpacity="0" />
              <Stop offset="0.62" stopColor="#28184E" stopOpacity="0.35" />
              <Stop offset="1" stopColor="#28184E" stopOpacity="0.95" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#cover)" />
        </Svg>
      </View>
      <View style={styles.over}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', backgroundColor: colors.primaryDark, justifyContent: 'flex-end' },
  over: { padding: 20, paddingBottom: 22 },
});
