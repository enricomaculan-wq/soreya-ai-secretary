"use client";

import type { DemoCustomerRequestAnalysis, SupportedLocale } from "@soreya/shared";

const CACHE_KEY = "soreya-demo-analysis-cache";

type CacheEntry = {
  locale: SupportedLocale;
  customerText: string;
  analysis: DemoCustomerRequestAnalysis;
  cachedAt: string;
};

function readCache(): CacheEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCache(entries: CacheEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(0, 12)));
}

function cacheKey(locale: SupportedLocale, customerText: string) {
  return `${locale}::${customerText.trim().toLowerCase()}`;
}

export function readCachedDemoAnalysis(locale: SupportedLocale, customerText: string) {
  const key = cacheKey(locale, customerText);
  const hit = readCache().find((entry) => cacheKey(entry.locale, entry.customerText) === key);
  return hit?.analysis ?? null;
}

export function writeCachedDemoAnalysis(
  locale: SupportedLocale,
  customerText: string,
  analysis: DemoCustomerRequestAnalysis,
) {
  const key = cacheKey(locale, customerText);
  const next = [
    {
      locale,
      customerText: customerText.trim(),
      analysis,
      cachedAt: new Date().toISOString(),
    },
    ...readCache().filter((entry) => cacheKey(entry.locale, entry.customerText) !== key),
  ];

  writeCache(next);
}
