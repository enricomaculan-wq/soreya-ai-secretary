import { normalizeMicrosoftCalendarEvent } from "@soreya/ai";
import { upsertConnectedCalendarAccount } from "@soreya/database";

import { jsonError, readMicrosoftOAuthConfig, scopesFromTokenResponse, verifyOAuthState, type OAuthTokenResponse } from "@/lib/server/calendar-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { encryptToken } from "@/lib/server/token-encryption";
import { NextResponse } from "next/server";

type MicrosoftProfile = {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

const MICROSOFT_FALLBACK_SCOPES = ["offline_access", "User.Read", "Calendars.Read"];

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    await verifyOAuthState("microsoft", url.searchParams.get("state"));
    const code = url.searchParams.get("code");

    if (!code) {
      throw new Error("Missing Microsoft OAuth code.");
    }

    const context = await getAuthenticatedServerContext();
    const config = readMicrosoftOAuthConfig();
    const tokenResponse = await exchangeMicrosoftCode(code, config);

    if (!tokenResponse.access_token) {
      throw new Error(tokenResponse.error_description ?? "Microsoft did not return an access token.");
    }

    const profile = await fetchMicrosoftProfile(tokenResponse.access_token);
    const email = profile.mail ?? profile.userPrincipalName ?? context.user.email ?? null;
    const providerAccountId = profile.id ?? email;

    if (!providerAccountId) {
      throw new Error("Unable to identify Microsoft calendar account.");
    }

    await upsertConnectedCalendarAccount(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      ownerUserId: context.user.id,
      provider: "microsoft",
      providerAccountId,
      email,
      displayName: profile.displayName ?? email,
      accessTokenEncrypted: encryptToken(tokenResponse.access_token),
      refreshTokenEncrypted: tokenResponse.refresh_token ? encryptToken(tokenResponse.refresh_token) : null,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null,
      scopes: scopesFromTokenResponse(tokenResponse, MICROSOFT_FALLBACK_SCOPES),
      status: "active",
      metadata: {
        oauth_provider: "microsoft",
        normalized_event_shape: normalizeMicrosoftCalendarEvent.name,
      },
    });

    return NextResponse.redirect(new URL("/settings?calendar=microsoft-connected", request.url));
  } catch (error) {
    return jsonError(error, 400);
  }
}

async function exchangeMicrosoftCode(
  code: string,
  config: ReturnType<typeof readMicrosoftOAuthConfig>,
): Promise<OAuthTokenResponse> {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
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
    throw new Error(payload.error_description ?? "Microsoft token exchange failed.");
  }

  return payload;
}

async function fetchMicrosoftProfile(accessToken: string): Promise<MicrosoftProfile> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return {};
  }

  return (await response.json()) as MicrosoftProfile;
}
