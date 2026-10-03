import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { Button, FileUploader, Input, Select, StepProgress, Textarea } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { investorApplicationService } from '../../src/services';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { colors, spacing } from '../../src/theme/tokens';

const APPLICANT_TYPES = [
  'Individual',
  'Angel investor',
  'Company',
  'VC fund',
  'Family office',
  'Diaspora investor',
  'Development finance or NGO',
].map((t) => ({ label: t, value: t }));

const SOURCE_FUNDS = ['Salary', 'Business income', 'Investments', 'Inheritance', 'Other'].map((t) => ({
  label: t,
  value: t,
}));

export default function InvestorApplicationScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { investorAppStep, investorAppData, setInvestorApp } = useOnboardingStore();
  const [step, setStep] = useState(investorAppStep);
  const [data, setData] = useState<Record<string, unknown>>(investorAppData);
  const [refs, setRefs] = useState([{ name: '', relationship: '', email: '', phone: '' }, { name: '', relationship: '', email: '', phone: '' }]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const merge = (p: Record<string, unknown>) => setData((d) => ({ ...d, ...p }));

  const saveDraft = async () => {
    setInvestorApp(step, data);
    await investorApplicationService.saveDraft(step, data);
    show('Draft saved', 'success');
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await investorApplicationService.submit({ ...data, refs, signature, checks });
      router.replace({ pathname: '/investor-application/confirmation', params: { ref: res.referenceNumber } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Header title="Investor application" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <StepProgress current={step} total={9} />
        {step === 1 && (
          <Select label="Applicant type" options={APPLICANT_TYPES} value={String(data.applicantType ?? '')} onChange={(v) => merge({ applicantType: v })} />
        )}
        {step === 2 && (
          <>
            <Input label="Full name" value={String(data.fullName ?? '')} onChangeText={(t) => merge({ fullName: t })} />
            <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={String(data.email ?? '')} onChangeText={(t) => merge({ email: t })} />
            <Input label="Phone (+254)" value={String(data.phone ?? '+254')} onChangeText={(t) => merge({ phone: t })} />
            <Input label="Nationality" value={String(data.nationality ?? '')} onChangeText={(t) => merge({ nationality: t })} />
            <Input label="Country of residence" value={String(data.residence ?? '')} onChangeText={(t) => merge({ residence: t })} />
            <Input label="National ID / Passport" value={String(data.idNumber ?? '')} onChangeText={(t) => merge({ idNumber: t })} />
            <Input label="LinkedIn URL" autoCapitalize="none" value={String(data.linkedin ?? '')} onChangeText={(t) => merge({ linkedin: t })} />
          </>
        )}
        {step === 3 && (
          <>
            <Input label="Organization name" value={String(data.orgName ?? '')} onChangeText={(t) => merge({ orgName: t })} />
            <Input label="Registration number" value={String(data.regNumber ?? '')} onChangeText={(t) => merge({ regNumber: t })} />
            <Input label="Role / title" value={String(data.role ?? '')} onChangeText={(t) => merge({ role: t })} />
          </>
        )}
        {step === 4 && (
          <>
            <Input label="Years investing" keyboardType="number-pad" value={String(data.yearsExp ?? '')} onChangeText={(t) => merge({ yearsExp: t })} />
            <Textarea label="Previous investments (examples)" value={String(data.trackRecord ?? '')} onChangeText={(t) => merge({ trackRecord: t })} />
            <Input label="Typical ticket (KES)" keyboardType="number-pad" value={String(data.ticket ?? '')} onChangeText={(t) => merge({ ticket: t })} />
          </>
        )}
        {step === 5 && (
          <>
            <Select label="Source of funds" options={SOURCE_FUNDS} value={String(data.sourceFunds ?? '')} onChange={(v) => merge({ sourceFunds: v })} />
            <Textarea label="Explain source of funds" value={String(data.sourceExplain ?? '')} onChangeText={(t) => merge({ sourceExplain: t })} />
            {['accredited', 'pep', 'sanctions'].map((key) => (
              <Pressable key={key} style={styles.checkRow} onPress={() => setChecks((c) => ({ ...c, [key]: !c[key] }))}>
                <View style={[styles.box, checks[key] && styles.boxOn]} />
                <Text style={styles.checkText}>{key === 'accredited' ? 'Accredited / qualified investor declaration' : key === 'pep' ? 'PEP declaration' : 'No sanctions / legal issues'}</Text>
              </Pressable>
            ))}
          </>
        )}
        {step === 6 && (
          <>
            <FileUploader label="National ID / Passport" onChange={() => merge({ idDoc: true })} />
            <FileUploader label="Proof of address (≤3 months)" onChange={() => merge({ addressDoc: true })} />
            <FileUploader label="KRA PIN / tax ID" onChange={() => merge({ kraDoc: true })} />
            <FileUploader label="Proof of funds" onChange={() => merge({ fundsDoc: true })} />
          </>
        )}
        {step === 7 && (
          <>
            {refs.map((r, i) => (
              <View key={i} style={styles.refBlock}>
                <Text style={styles.refTitle}>Reference {i + 1}</Text>
                <Input label="Name" value={r.name} onChangeText={(t) => { const n = [...refs]; n[i].name = t; setRefs(n); }} />
                <Input label="Relationship" value={r.relationship} onChangeText={(t) => { const n = [...refs]; n[i].relationship = t; setRefs(n); }} />
                <Input label="Email" value={r.email} onChangeText={(t) => { const n = [...refs]; n[i].email = t; setRefs(n); }} />
                <Input label="Phone" value={r.phone} onChangeText={(t) => { const n = [...refs]; n[i].phone = t; setRefs(n); }} />
              </View>
            ))}
          </>
        )}
        {step === 8 && (
          <>
            {['trueInfo', 'terms', 'nda', 'kyc', 'dataAct'].map((key, idx) => (
              <Pressable key={key} style={styles.checkRow} onPress={() => setChecks((c) => ({ ...c, [key]: !c[key] }))}>
                <View style={[styles.box, checks[key] && styles.boxOn]} />
                <Text style={styles.checkText}>
                  {[
                    'Information provided is true',
                    'Agree to platform Terms',
                    'Agree to NDA & confidentiality',
                    'Consent to background / KYC checks',
                    'Consent under Kenya Data Protection Act',
                  ][idx]}
                </Text>
              </Pressable>
            ))}
            <Input label="Typed full-name e-signature" value={signature} onChangeText={setSignature} />
            <Text style={styles.date}>Date: {new Date().toLocaleDateString('en-KE')}</Text>
          </>
        )}
        {step === 9 && (
          <View>
            <Text style={styles.reviewTitle}>Review & submit</Text>
            <Text style={styles.reviewLine}>{String(data.fullName ?? 'Applicant')}</Text>
            <Text style={styles.reviewLine}>{String(data.email ?? '')}</Text>
            <Text style={styles.reviewHint}>Expected review: 5–10 business days.</Text>
          </View>
        )}
        <View style={styles.actions}>
          <Button title="Save draft" variant="secondary" onPress={saveDraft} />
          {step > 1 && <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} />}
          {step < 9 ? (
            <Button title="Continue" onPress={() => { const ns = step + 1; setStep(ns); setInvestorApp(ns, data); }} />
          ) : (
            <Button title="Submit application" loading={submitting} onPress={submit} />
          )}
        </View>
        <Pressable onPress={() => Linking.openURL('https://founderlink.co.ke/privacy')}>
          <Text style={styles.privacy}>Privacy Policy</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing[3], paddingBottom: spacing[6] },
  checkRow: { flexDirection: 'row', gap: spacing[1], marginBottom: spacing[2], alignItems: 'flex-start' },
  box: { width: 22, height: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginTop: 2 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  refBlock: { marginBottom: spacing[3], paddingBottom: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  refTitle: { fontWeight: '700', marginBottom: spacing[1], color: colors.text },
  date: { color: colors.textMuted, marginTop: spacing[1] },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  reviewLine: { color: colors.text, marginTop: 4 },
  reviewHint: { color: colors.textMuted, marginTop: spacing[2] },
  actions: { gap: spacing[2], marginTop: spacing[3] },
  privacy: { textAlign: 'center', color: colors.primary, marginTop: spacing[2] },
});
