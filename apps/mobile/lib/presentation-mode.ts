import AsyncStorage from '@react-native-async-storage/async-storage';

const PRESENTATION_MODE_KEY = 'soreya.mobile.presentation-mode';

export async function readMobilePresentationMode() {
  const value = await AsyncStorage.getItem(PRESENTATION_MODE_KEY);
  return value === '1';
}

export async function writeMobilePresentationMode(enabled: boolean) {
  await AsyncStorage.setItem(PRESENTATION_MODE_KEY, enabled ? '1' : '0');
}
