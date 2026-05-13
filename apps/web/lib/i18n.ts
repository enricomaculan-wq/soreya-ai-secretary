"use client";

import {
  DEFAULT_LOCALE,
  getDictionary,
  labelFor,
  resolveLocale,
  t,
  type Dictionary,
  type SupportedLocale,
} from "@soreya/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "soreya.locale";
const COOKIE_KEY = "soreya_locale";
const LOCALE_EVENT = "soreya-locale-change";

export function getWebLocale(): SupportedLocale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored) {
    return resolveLocale(stored);
  }

  const cookieLocale = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${COOKIE_KEY}=`))
    ?.split("=")[1];

  return resolveLocale(cookieLocale ?? navigator.language);
}

export function setWebLocale(locale: SupportedLocale) {
  if (typeof window === "undefined") {
    return;
  }

  const resolved = resolveLocale(locale);
  window.localStorage.setItem(STORAGE_KEY, resolved);
  document.cookie = `${COOKIE_KEY}=${resolved}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: resolved }));
}

export function getWebDictionary(locale?: SupportedLocale): Dictionary {
  return getDictionary(locale ?? getWebLocale());
}

export function useI18n() {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => getWebLocale());

  useEffect(() => {
    function handleLocaleChange() {
      setLocaleState(getWebLocale());
    }

    window.addEventListener(LOCALE_EVENT, handleLocaleChange);
    window.addEventListener("storage", handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_EVENT, handleLocaleChange);
      window.removeEventListener("storage", handleLocaleChange);
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
  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setWebLocale(nextLocale);
    setLocaleState(resolveLocale(nextLocale));
  }, []);

  return {
    locale,
    dictionary,
    t: translate,
    label,
    setLocale,
  };
}
