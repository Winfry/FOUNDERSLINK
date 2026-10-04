import { ExternalLink } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { colors, spacing } from '../../theme/tokens';

// Where a founder can open a bank account in the business name. Official
// websites, opened in the browser. No bank pays to be listed and none is a
// FoundersLink partner; the order is alphabetical. Links checked 4 Oct 2026.
export const BANKS: { name: string; url: string }[] = [
  { name: 'Absa Bank Kenya', url: 'https://www.absabank.co.ke/business/' },
  { name: 'Co-operative Bank', url: 'https://www.co-opbank.co.ke/' },
  { name: 'Diamond Trust Bank (DTB)', url: 'https://dtbk.dtbafrica.com/' },
  { name: 'Equity Bank', url: 'https://equitygroupholdings.com/ke/business' },
  { name: 'Family Bank', url: 'https://familybank.co.ke/' },
  { name: 'I&M Bank', url: 'https://www.imbankgroup.com/ke' },
  { name: 'KCB Bank', url: 'https://ke.kcbgroup.com/' },
  { name: 'NCBA Bank', url: 'https://ncbagroup.com/ke/' },
  { name: 'Stanbic Bank', url: 'https://www.stanbicbank.co.ke/kenya/business' },
  { name: 'Standard Chartered', url: 'https://www.sc.com/ke/business/' },
];

export const BANK_ACCOUNT_ITEM = 'business_bank_account';

export function BankOptions() {
  return (
    <View style={styles.box}>
      <Text style={styles.heading}>Open one with a bank</Text>
      <Text style={styles.note}>
        Usually needed: your business registration certificate, the company or business KRA PIN, and the
        directors' IDs and KRA PINs. Each bank's website lists its own requirements.
      </Text>
      {BANKS.map((bank) => (
        <Pressable
          key={bank.name}
          accessibilityRole="link"
          accessibilityLabel={`Open the ${bank.name} website`}
          onPress={() => void Linking.openURL(bank.url).catch(() => undefined)}
          style={styles.row}
        >
          <Text style={styles.name}>{bank.name}</Text>
          <ExternalLink size={16} color={colors.textMuted} />
        </Pressable>
      ))}
      <Text style={styles.footnote}>Listed alphabetically. FoundersLink does not partner with or recommend any bank.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: spacing[1], gap: spacing[0.5] },
  heading: { fontSize: 15, fontWeight: '700', color: colors.text },
  note: { fontSize: 13, color: colors.textMuted, marginBottom: spacing[0.5] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  name: { fontSize: 15, color: colors.text },
  footnote: { fontSize: 12, color: colors.textMuted, marginTop: spacing[0.5] },
});
