import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, touchTargetMin } from '../../theme/tokens';

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing[1] }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.back} accessibilityLabel="Go back">
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  back: {
    minWidth: touchTargetMin,
    minHeight: touchTargetMin,
    justifyContent: 'center',
    marginLeft: -8,
  },
  backPlaceholder: { width: touchTargetMin - 8 },
  titles: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  right: { minWidth: touchTargetMin, alignItems: 'flex-end' },
});
