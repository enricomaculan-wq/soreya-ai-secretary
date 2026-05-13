import { getSoreyaDemoData, SOREYA_DEMO_COPY, type SupportedLocale } from '@soreya/shared';

import { hasSupabaseMobileConfig } from '@/lib/supabase';

export function shouldUseMobileDemoData() {
  return process.env.NODE_ENV !== 'production' && (
    process.env.EXPO_PUBLIC_USE_DEMO_DATA === 'true' || !hasSupabaseMobileConfig()
  );
}

export function getMobileDemoData(locale: SupportedLocale = 'it') {
  return getSoreyaDemoData(locale);
}

export const MOBILE_DEMO_NOTICE = `${SOREYA_DEMO_COPY} Set EXPO_PUBLIC_USE_DEMO_DATA=false and configure Supabase to use real data.`;
