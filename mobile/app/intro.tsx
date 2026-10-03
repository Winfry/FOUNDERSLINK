import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { Button } from '../src/components/ui';
import { colors, spacing } from '../src/theme/tokens';

const SLIDES = [
  {
    id: '1',
    title: 'Verified founders & investors',
    body: 'Onboard with BRS, KRA, and KYC-ready document checks built for Kenya.',
  },
  {
    id: '2',
    title: 'Match on what matters',
    body: 'Discover projects by sector, ticket size, county, and impact tags — with clear match reasons.',
  },
  {
    id: '3',
    title: 'Pool funds with confidence',
    body: 'Track deposits, M-Pesa references, withdrawals, and group chat in one place.',
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const width = Dimensions.get('window').width;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => router.replace('/welcome')} style={styles.skip} accessibilityRole="button">
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
      <FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: width - spacing[3] * 2 }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <Button
        title={index === SLIDES.length - 1 ? 'Get started' : 'Next'}
        onPress={() =>
          index === SLIDES.length - 1 ? router.replace('/welcome') : setIndex((i) => Math.min(i + 1, 2))
        }
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white, padding: spacing[3], paddingTop: spacing[5] },
  skip: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  skipText: { color: colors.primary, fontWeight: '600' },
  slide: { paddingVertical: spacing[4] },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing[2] },
  body: { fontSize: 16, color: colors.textMuted, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing[3] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  cta: { marginBottom: spacing[2] },
});
