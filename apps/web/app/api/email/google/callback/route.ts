import { upsertConnectedEmailAccount } from "@soreya/database";

import {
  jsonError,
  readGmailOAuthConfig,
  scopesFromTokenResponse,
  verifyEmailOAuthState,
  type OAuthTokenResponse,
} from "@/lib/server/email-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { encryptToken } from "@/lib/server/token-encryption";
import { NextResponse } from "next/server";

type GoogleProfile = {
  id?: string;
  email?: string;
  name?: string;
};

const GMAIL_FALLBACK_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    await verifyEmailOAuthState("gmail", url.searchParams.get("state"));
    const code = url.searchParams.get("code");

    if (!code) {
      throw new Error("Missing Google Gmail OAuth code.");
    }

    const context = await getAuthenticatedServerContext();
    const config = readGmailOAuthConfig();
    const tokenResponse = await exchangeGoogleCode(code, config);

    if (!tokenResponse.access_token) {
      throw new Error(tokenResponse.error_description ?? "Google did not return an access token.");
    }

    const profile = await fetchGoogleProfile(tokenResponse.access_token);
    const email = profile.email ?? context.user.email ?? null;
    const providerAccountId = profile.id ?? email;

    if (!providerAccountId) {
      throw new Error("Unable to identify Gmail account.");
    }

    await upsertConnectedEmailAccount(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      ownerUserId: context.user.id,
      provider: "gmail",
      providerAccountId,
      email,
      displayName: profile.name ?? email,
      accessTokenEncrypted: encryptToken(tokenResponse.access_token, "EMAIL_TOKEN_ENCRYPTION_KEY"),
      refreshTokenEncrypted: tokenResponse.refresh_token
        ? encryptToken(tokenResponse.refresh_token, "EMAIL_TOKEN_ENCRYPTION_KEY")
        : null,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null,
      scopes: scopesFromTokenResponse(tokenResponse, GMAIL_FALLBACK_SCOPES),
      status: "active",
      metadata: { oauth_provider: "gmail" },
    });

    return NextResponse.redirect(new URL("/settings?email=gmail-connected", request.url));
  } catch (error) {
    return jsonError(error, 400);
  }
}

async function exchangeGoogleCode(
  code: string,
  config: ReturnType<typeof readGmailOAuthConfig>,
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
    throw new Error(payload.error_description ?? "Google Gmail token exchange failed.");
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
