import type { EmailProvider } from "@soreya/shared";
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

export function readGmailOAuthConfig(request?: Request) {
  const redirectUri =
    process.env.GOOGLE_GMAIL_REDIRECT_URI ??
    process.env.GOOGLE_REDIRECT_URI ??
    (request ? `${new URL(request.url).origin}/api/email/google/callback` : "http://localhost:3000/api/email/google/callback");

  return {
    clientId: optionalEnv("GOOGLE_GMAIL_CLIENT_ID", "GOOGLE_CLIENT_ID"),
    clientSecret: optionalEnv("GOOGLE_GMAIL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"),
    redirectUri,
  };
}

export const GMAIL_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
] as const;

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function readMicrosoftMailOAuthConfig() {
  return {
    clientId: optionalEnv("MICROSOFT_MAIL_CLIENT_ID", "MICROSOFT_CLIENT_ID"),
    clientSecret: optionalEnv("MICROSOFT_MAIL_CLIENT_SECRET", "MICROSOFT_CLIENT_SECRET"),
    tenantId: process.env.MICROSOFT_MAIL_TENANT_ID ?? process.env.MICROSOFT_TENANT_ID ?? "common",
    redirectUri: process.env.MICROSOFT_MAIL_REDIRECT_URI ?? "http://localhost:3000/api/email/microsoft/callback",
  };
}

export async function setEmailOAuthState(provider: EmailProvider, state: string) {
  const cookieStore = await cookies();
  cookieStore.set(stateCookieName(provider), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function verifyEmailOAuthState(provider: EmailProvider, state: string | null) {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(stateCookieName(provider))?.value;
  cookieStore.delete(stateCookieName(provider));

  if (!state || !storedState || state !== storedState) {
    throw new Error("Invalid email OAuth state.");
  }
}

export function nextEmailSyncRange(days = 30) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);

  return {
    start: start.toISOString(),
    end: new Date().toISOString(),
  };
}

export function scopesFromTokenResponse(response: OAuthTokenResponse, fallback: string[]): string[] {
  return response.scope ? response.scope.split(/\s+/).filter(Boolean) : fallback;
}

function optionalEnv(primaryName: string, fallbackName: string): string {
  const value = process.env[primaryName] ?? process.env[fallbackName];

  if (!value) {
    throw new Error(`Missing ${primaryName} or ${fallbackName}.`);
  }

  return value;
}

function stateCookieName(provider: EmailProvider): string {
  return `soreya-email-${provider}-oauth-state`;
}
