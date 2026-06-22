import { normalizeGoogleCalendarEvent } from "@soreya/ai";
import { upsertConnectedCalendarAccount } from "@soreya/database";

import { encryptToken } from "@/lib/server/token-encryption";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { NextResponse } from "next/server";

import { readGoogleOAuthConfig, GOOGLE_CALENDAR_OAUTH_SCOPES, scopesFromTokenResponse, verifyOAuthState, type OAuthTokenResponse } from "@/lib/server/calendar-api";

type GoogleProfile = {
  id?: string;
  email?: string;
  name?: string;
};

const GOOGLE_FALLBACK_SCOPES = [...GOOGLE_CALENDAR_OAUTH_SCOPES];

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    await verifyOAuthState("google", url.searchParams.get("state"));
    const code = url.searchParams.get("code");

    if (!code) {
      throw new Error("Missing Google OAuth code.");
    }

    const context = await getAuthenticatedServerContext();
    const config = readGoogleOAuthConfig(request);
    const tokenResponse = await exchangeGoogleCode(code, config);

    if (!tokenResponse.access_token) {
      throw new Error(tokenResponse.error_description ?? "Google did not return an access token.");
    }

    const profile = await fetchGoogleProfile(tokenResponse.access_token);
    const email = profile.email ?? context.user.email ?? null;
    const providerAccountId = profile.id ?? email;

    if (!providerAccountId) {
      throw new Error("Unable to identify Google calendar account.");
    }

    await upsertConnectedCalendarAccount(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      ownerUserId: context.user.id,
      provider: "google",
      providerAccountId,
      email,
      displayName: profile.name ?? email,
      accessTokenEncrypted: encryptToken(tokenResponse.access_token),
      refreshTokenEncrypted: tokenResponse.refresh_token ? encryptToken(tokenResponse.refresh_token) : null,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null,
      scopes: scopesFromTokenResponse(tokenResponse, GOOGLE_FALLBACK_SCOPES),
      status: "active",
      metadata: {
        oauth_provider: "google",
        normalized_event_shape: normalizeGoogleCalendarEvent.name,
      },
    });

    return NextResponse.redirect(new URL("/settings?calendar=google-connected", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("calendar", "google-error");
    redirectUrl.searchParams.set("error", message);
    return NextResponse.redirect(redirectUrl);
  }
}

async function exchangeGoogleCode(
  code: string,
  config: ReturnType<typeof readGoogleOAuthConfig>,
): Promise<OAuthTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  const payload = (await response.json()) as OAuthTokenResponse;

  if (!response.ok) {
    throw new Error(payload.error_description ?? "Google token exchange failed.");
  }

  return payload;
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return {};
  }

  return (await response.json()) as GoogleProfile;
}
