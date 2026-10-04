import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'founderlink_welcome_seen_v2';

export async function getWelcomeSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}
