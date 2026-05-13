import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_LOCALE,
  getDictionary,
  labelFor,
  resolveLocale,
  t,
  type SupportedLocale,
} from '@soreya/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

const STORAGE_KEY = 'soreya.locale';
const listeners = new Set<(locale: SupportedLocale) => void>();
let currentLocale: SupportedLocale = DEFAULT_LOCALE;

export async function getMobileLocale(): Promise<SupportedLocale> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  currentLocale = resolveLocale(stored ?? (I18nManager.isRTL ? 'it' : DEFAULT_LOCALE));
  return currentLocale;
}

export async function setMobileLocale(locale: SupportedLocale) {
  currentLocale = resolveLocale(locale);
  await AsyncStorage.setItem(STORAGE_KEY, currentLocale);
  listeners.forEach((listener) => listener(currentLocale));
}

export function useI18n() {
  const [locale, setLocaleState] = useState<SupportedLocale>(currentLocale);

  useEffect(() => {
    let isMounted = true;

    getMobileLocale().then((nextLocale) => {
      if (isMounted) {
        setLocaleState(nextLocale);
      }
    });

    const listener = (nextLocale: SupportedLocale) => setLocaleState(nextLocale);
    listeners.add(listener);

    return () => {
      isMounted = false;
      listeners.delete(listener);
    };
  }, []);

  const dictionary = useMemo(() => getDictionary(locale), [locale]);
  const translate = useCallback(
    (key: string, params?: Record<string, string | number | boolean | null | undefined>) => t(dictionary, key, params),
    [dictionary],
  );
  const label = useCallback(
    (group: string, value: string | null | undefined) => labelFor(dictionary, group, value),
    [dictionary],
  );
  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    await setMobileLocale(nextLocale);
  }, []);

  return {
    locale,
    dictionary,
    t: translate,
    label,
    setLocale,
  };
}
