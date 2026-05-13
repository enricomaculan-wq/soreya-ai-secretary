import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { jsonError, readGoogleOAuthConfig, setOAuthState } from "@/lib/server/calendar-api";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

export async function GET() {
  try {
    await getAuthenticatedServerContext();
    const config = readGoogleOAuthConfig();
    const state = randomUUID();
    await setOAuthState("google", state);

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    return NextResponse.redirect(url);
  } catch (error) {
    return jsonError(error, 401);
  }
}
