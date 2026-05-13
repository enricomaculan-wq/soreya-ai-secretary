"use client";

import { getSoreyaDemoData, SOREYA_DEMO_COPY, type SupportedLocale } from "@soreya/shared";

import { hasSupabaseBrowserConfig } from "@/lib/supabase";

export function shouldUseWebDemoData() {
  return process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true" || !hasSupabaseBrowserConfig();
}

export function getWebDemoData(locale: SupportedLocale = "it") {
  return getSoreyaDemoData(locale);
}

export const WEB_DEMO_NOTICE = `${SOREYA_DEMO_COPY} Set NEXT_PUBLIC_USE_DEMO_DATA=false and configure Supabase to use real data.`;
