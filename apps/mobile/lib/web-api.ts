import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';
import { shouldUseMobileDemoData } from '@/lib/demo-data';

type ApiErrorBody = {
  error?: string;
};

export function getWebAppUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();

  if (!value) {
    return null;
  }

  return value.replace(/\/$/, '');
}

export function shouldUseMobileWebApi(): boolean {
  return !shouldUseMobileDemoData() && hasSupabaseMobileConfig() && Boolean(getWebAppUrl());
}

export async function getMobileAccessToken(): Promise<string> {
  const { data, error } = await getSupabaseMobileClient().auth.getSession();

  if (error) {
    throw error;
  }

  if (!data.session?.access_token) {
    throw new Error('session_required');
  }

  return data.session.access_token;
}

export async function fetchWebApi<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getWebAppUrl();

  if (!baseUrl) {
    throw new Error('web_app_url_missing');
  }

  const accessToken = await getMobileAccessToken();
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    throw new Error(payload.error ?? 'request_failed');
  }

  return payload;
}

export async function postWebApi<T>(path: string, body: unknown): Promise<T> {
  return fetchWebApi<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
