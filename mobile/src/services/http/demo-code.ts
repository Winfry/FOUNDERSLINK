import { Alert, Platform } from 'react-native';

/**
 * Outside production, when the backend could not send a code by email
 * or SMS (no SMS provider is connected, and the email service delivers
 * only to its owner), it returns the code as `dev_code`. Showing it lets
 * the demo continue, and says plainly that it is a demo.
 */
export function showDemoCode(answer: { dev_code?: string } | null | undefined, sentBy: 'email' | 'SMS') {
  if (!answer?.dev_code) return;
  const message = `This demo cannot send the ${sentBy}. Your code is ${answer.dev_code}`;
  // In a browser, React Native's Alert does nothing.
  if (Platform.OS === 'web') globalThis.alert?.(`Demo code. ${message}`);
  else Alert.alert('Demo code', message);
}
