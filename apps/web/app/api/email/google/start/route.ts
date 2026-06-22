import { jsonError, GMAIL_OAUTH_SCOPES, readGmailOAuthConfig, setEmailOAuthState } from "@/lib/server/email-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await getAuthenticatedServerContext();
    const config = readGmailOAuthConfig(request);
    const state = randomUUID();
    await setEmailOAuthState("gmail", state);

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GMAIL_OAUTH_SCOPES.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    return NextResponse.redirect(url);
  } catch (error) {
    return jsonError(error, 401);
  }
}
