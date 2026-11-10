import { Redirect } from 'expo-router';

// The expert's home moved into her workspace tabs (Overview). Old links
// and notifications that point here still arrive.
export default function ExpertHomeRedirect() {
  return <Redirect href={'/(expert)/(tabs)/sessions' as never} />;
}
