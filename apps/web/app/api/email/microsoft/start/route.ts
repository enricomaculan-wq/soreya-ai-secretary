import { jsonError, readMicrosoftMailOAuthConfig, setEmailOAuthState } from "@/lib/server/email-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const MICROSOFT_MAIL_SCOPES = ["offline_access", "User.Read", "Mail.Read"];

export async function GET() {
  try {
    await getAuthenticatedServerContext();
    const config = readMicrosoftMailOAuthConfig();
    const state = randomUUID();
    await setEmailOAuthState("microsoft", state);

    const url = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", MICROSOFT_MAIL_SCOPES.join(" "));
    url.searchParams.set("state", state);

    return NextResponse.redirect(url);
  } catch (error) {
    return jsonError(error, 401);
  }
}
