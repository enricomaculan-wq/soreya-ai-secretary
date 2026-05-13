import type { CalendarProvider } from "@soreya/shared";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}

export function readGoogleOAuthConfig() {
  return {
    clientId: requiredEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/calendar/google/callback",
  };
}

export function readMicrosoftOAuthConfig() {
  return {
    clientId: requiredEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: requiredEnv("MICROSOFT_CLIENT_SECRET"),
    tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
    redirectUri: process.env.MICROSOFT_REDIRECT_URI ?? "http://localhost:3000/api/calendar/microsoft/callback",
  };
}

export async function setOAuthState(provider: CalendarProvider, state: string) {
  const cookieStore = await cookies();
  cookieStore.set(stateCookieName(provider), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function verifyOAuthState(provider: CalendarProvider, state: string | null) {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(stateCookieName(provider))?.value;
  cookieStore.delete(stateCookieName(provider));

  if (!state || !storedState || state !== storedState) {
    throw new Error("Invalid calendar OAuth state.");
  }
}

export function nextCalendarSyncRange(days = 30) {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function scopesFromTokenResponse(response: OAuthTokenResponse, fallback: string[]): string[] {
  return response.scope ? response.scope.split(/\s+/).filter(Boolean) : fallback;
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function stateCookieName(provider: CalendarProvider): string {
  return `soreya-calendar-${provider}-oauth-state`;
}
