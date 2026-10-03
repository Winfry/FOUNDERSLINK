import { Redirect } from 'expo-router';

/** Founders must apply and be approved — no direct self-signup. */
export default function FounderSignupRedirect() {
  return <Redirect href="/founder-application" />;
}
