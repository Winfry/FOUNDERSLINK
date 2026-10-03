import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Header } from '../../src/components/layout/Header';
import { Button, Input, Select, Textarea } from '../../src/components/ui';
import { useToast } from '../../src/components/ui/Toast';
import { useRouter } from 'expo-router';
import { spacing } from '../../src/theme/tokens';

export default function ReportScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [target, setTarget] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  return (
    <>
      <Header title="Report / block" onBack={() => router.back()} />
      <Select label="Report type" options={[{ label: 'User', value: 'user' }, { label: 'Group', value: 'group' }]} value={target} onChange={setTarget} />
      <Input label="Name or ID" value={name} onChangeText={setName} />
      <Textarea label="Details" value={details} onChangeText={setDetails} />
      <Button title="Submit report" onPress={() => { show('Report received', 'success'); router.back(); }} style={styles.btn} />
    </>
  );
}

const styles = StyleSheet.create({ btn: { margin: spacing[3] } });
