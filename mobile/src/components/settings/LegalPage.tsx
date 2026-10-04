import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { Note, SettingsPage } from './SettingsPage';
import { colors, spacing } from '../../theme/tokens';

export interface LegalSection {
  title: string;
  /** Each entry is one paragraph. */
  body: string[];
}

/** A long read: the date, the demo note, then titled sections. */
export function LegalPage({ title, heading, intro, sections }: { title: string; heading: string; intro: string; sections: LegalSection[] }) {
  return (
    <SettingsPage title={title} heading={heading} intro={intro}>
      <View style={styles.meta}>
        <Text style={styles.updated}>Last updated 4 October 2026</Text>
        <Note tone="warning">
          This is the hackathon demo version. It describes how the demo works today and has not yet been reviewed by a lawyer.
        </Note>
      </View>
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.title}>{s.title}</Text>
          {s.body.map((p) => (
            <Text key={p} style={styles.body}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing[1.5] },
  updated: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  section: { gap: spacing[1] },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, fontWeight: '500', color: colors.text, lineHeight: 24 },
});
