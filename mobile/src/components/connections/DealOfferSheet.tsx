import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { BottomSheet, Button } from '../ui';
import { formatKes } from '../../services/mocks/kenya-data';
import type { Instrument } from '../../types';
import { colors, spacing, touchTargetMin } from '../../theme/tokens';

export type OfferInstrument = Extract<Instrument, 'equity' | 'convertible_note'>;

const CHOICES: { value: OfferInstrument; label: string }[] = [
  { value: 'equity', label: 'Equity' },
  { value: 'convertible_note', label: 'Convertible note' },
];

// Shown after she accepts a request that proposed an amount (D13 §2).
// Nothing is chosen for her: she picks the instrument, or closes and stays connected.
export function DealOfferSheet({
  visible,
  investorName,
  amountKes,
  instrument,
  onChoose,
  onStart,
  onClose,
  loading,
}: {
  visible: boolean;
  investorName: string;
  amountKes: number;
  instrument: OfferInstrument | null;
  onChoose: (value: OfferInstrument) => void;
  onStart: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <BottomSheet visible={visible} title="Start an investment deal with these terms?" onClose={onClose}>
      <View style={styles.wrap}>
        <Text style={styles.text}>
          You and {investorName} are connected and can chat. You can also open a deal now, or leave it for later.
        </Text>

        <View style={styles.amount}>
          <Text style={styles.amountLabel}>{investorName} proposed</Text>
          <Text style={styles.amountValue}>{formatKes(amountKes)}</Text>
        </View>

        <Text style={styles.label}>How would they invest?</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {CHOICES.map((choice) => {
            const selected = instrument === choice.value;
            return (
              <Pressable
                key={choice.value}
                onPress={() => onChoose(choice.value)}
                disabled={loading}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.choice, selected && styles.choiceSelected]}
              >
                <View style={[styles.dot, selected && styles.dotSelected]}>
                  {selected ? <View style={styles.dotInner} /> : null}
                </View>
                <Text style={styles.choiceText}>{choice.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Button title="Start the deal" onPress={onStart} disabled={!instrument || loading} loading={loading} />
        {!instrument ? <Text style={styles.hint}>Choose equity or a convertible note to start.</Text> : null}
        <Button title="Not now" variant="ghost" onPress={onClose} disabled={loading} />
        <Text style={styles.hint}>Nothing is final until you both agree the terms.</Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[1.5] },
  text: { fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.text },
  amount: { padding: spacing[2], borderRadius: 12, backgroundColor: colors.primaryDark, gap: spacing[0.5] },
  amountLabel: { fontSize: 14, fontWeight: '600', color: '#D6E4FB' },
  amountValue: { fontSize: 24, fontWeight: '800', color: colors.white },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  choices: { gap: spacing[1] },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    minHeight: touchTargetMin,
    paddingHorizontal: spacing[2],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: { borderColor: colors.primary },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  choiceText: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { fontSize: 14, fontWeight: '500', color: colors.textMuted, textAlign: 'center' },
});
