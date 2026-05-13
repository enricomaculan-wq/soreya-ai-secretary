import {
  getAccountsNeedingRefresh,
  updateConnectedAccountTokens,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type { ConnectedAccount, SyncProvider, TokenRefreshResult } from "@soreya/shared";

import { decryptToken, encryptToken } from "@/lib/server/token-encryption";

type RefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type TokenRefreshWithSecrets = TokenRefreshResult & {
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
};

const REFRESH_WINDOW_MS = 5 * 60 * 1000;

export async function refreshGoogleToken(account: ConnectedAccount): Promise<TokenRefreshWithSecrets> {
  const provider = toSyncProvider(account.provider);
  const config = readGoogleRefreshConfig(account.provider);

  if (!config.ok) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: config.error,
    };
  }

  if (!account.encrypted_refresh_token) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: "Missing refresh token. Reconnect this Google account.",
    };
  }

  try {
    const refreshToken = decryptToken(account.encrypted_refresh_token, config.encryptionEnv);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const payload = (await response.json()) as RefreshResponse;

    if (!response.ok || !payload.access_token) {
      return {
        provider,
        refreshed: false,
        expiresAt: account.token_expires_at,
        errorMessage: payload.error_description ?? payload.error ?? "Google token refresh failed.",
      };
    }

    const expiresAt = expiresAtFromNow(payload.expires_in);

    return {
      provider,
      refreshed: true,
      expiresAt,
      errorMessage: null,
      accessTokenEncrypted: encryptToken(payload.access_token, config.encryptionEnv),
      refreshTokenEncrypted: payload.refresh_token ? encryptToken(payload.refresh_token, config.encryptionEnv) : undefined,
    };
  } catch (error) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: error instanceof Error ? error.message : "Google token refresh failed.",
    };
  }
}

export async function refreshMicrosoftToken(account: ConnectedAccount): Promise<TokenRefreshWithSecrets> {
  const provider = toSyncProvider(account.provider);
  const config = readMicrosoftRefreshConfig(account.provider);

  if (!config.ok) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: config.error,
    };
  }

  if (!account.encrypted_refresh_token) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: "Missing refresh token. Reconnect this Microsoft account.",
    };
  }

  try {
    const refreshToken = decryptToken(account.encrypted_refresh_token, config.encryptionEnv);
    const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: config.scope,
      }),
    });
    const payload = (await response.json()) as RefreshResponse;

    if (!response.ok || !payload.access_token) {
      return {
        provider,
        refreshed: false,
        expiresAt: account.token_expires_at,
        errorMessage: payload.error_description ?? payload.error ?? "Microsoft token refresh failed.",
      };
    }

    const expiresAt = expiresAtFromNow(payload.expires_in);

    return {
      provider,
      refreshed: true,
      expiresAt,
      errorMessage: null,
      accessTokenEncrypted: encryptToken(payload.access_token, config.encryptionEnv),
      refreshTokenEncrypted: payload.refresh_token ? encryptToken(payload.refresh_token, config.encryptionEnv) : undefined,
    };
  } catch (error) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: error instanceof Error ? error.message : "Microsoft token refresh failed.",
    };
  }
}

export async function refreshAccountTokenIfNeeded(
  supabase: SoreyaSupabaseClient,
  account: ConnectedAccount,
): Promise<TokenRefreshResult> {
  const provider = toSyncProvider(account.provider);

  if (!isRefreshableProvider(account.provider)) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: "Provider does not support token refresh in Soreya.",
    };
  }

  if (!account.encrypted_refresh_token && isTokenExpiring(account)) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: "Missing refresh token. Reconnect this provider account.",
    };
  }

  if (!shouldRefresh(account)) {
    return {
      provider,
      refreshed: false,
      expiresAt: account.token_expires_at,
      errorMessage: null,
    };
  }

  const result = account.provider === "google_calendar" || account.provider === "gmail"
    ? await refreshGoogleToken(account)
    : await refreshMicrosoftToken(account);

  if (result.refreshed && result.accessTokenEncrypted) {
    await updateConnectedAccountTokens(supabase, {
      accountId: account.id,
      accessTokenEncrypted: result.accessTokenEncrypted,
      refreshTokenEncrypted: result.refreshTokenEncrypted,
      expiresAt: result.expiresAt,
    });
  }

  return {
    provider: result.provider,
    refreshed: result.refreshed,
    expiresAt: result.expiresAt,
    errorMessage: result.errorMessage,
  };
}

export async function refreshOrganizationTokens(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
): Promise<TokenRefreshResult[]> {
  const accounts = await getAccountsNeedingRefresh(supabase, organizationId);
  const results: TokenRefreshResult[] = [];

  for (const account of accounts) {
    results.push(await refreshAccountTokenIfNeeded(supabase, account));
  }

  return results;
}

function shouldRefresh(account: ConnectedAccount): boolean {
  if (!account.encrypted_refresh_token) {
    return false;
  }

  return isTokenExpiring(account);
}

function isTokenExpiring(account: ConnectedAccount): boolean {
  if (!account.token_expires_at) {
    return true;
  }

  return new Date(account.token_expires_at).getTime() <= Date.now() + REFRESH_WINDOW_MS;
}

function expiresAtFromNow(expiresIn?: number): string | null {
  if (!expiresIn || Number.isNaN(expiresIn)) {
    return null;
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function readGoogleRefreshConfig(provider: ConnectedAccount["provider"]) {
  const isGmail = provider === "gmail";
  const clientId = isGmail ? process.env.GOOGLE_GMAIL_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID : process.env.GOOGLE_CLIENT_ID;
  const clientSecret = isGmail
    ? process.env.GOOGLE_GMAIL_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
    : process.env.GOOGLE_CLIENT_SECRET;
  const encryptionEnv = isGmail ? "EMAIL_TOKEN_ENCRYPTION_KEY" : "CALENDAR_TOKEN_ENCRYPTION_KEY";

  if (!clientId || !clientSecret) {
    return {
      ok: false as const,
      error: isGmail
        ? "Missing GOOGLE_GMAIL_CLIENT_ID/GOOGLE_GMAIL_CLIENT_SECRET or Google fallback env."
        : "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.",
    };
  }

  return {
    ok: true as const,
    clientId,
    clientSecret,
    encryptionEnv,
  };
}

function readMicrosoftRefreshConfig(provider: ConnectedAccount["provider"]) {
  const isMail = provider === "microsoft_mail";
  const clientId = isMail
    ? process.env.MICROSOFT_MAIL_CLIENT_ID ?? process.env.MICROSOFT_CLIENT_ID
    : process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = isMail
    ? process.env.MICROSOFT_MAIL_CLIENT_SECRET ?? process.env.MICROSOFT_CLIENT_SECRET
    : process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = isMail
    ? process.env.MICROSOFT_MAIL_TENANT_ID ?? process.env.MICROSOFT_TENANT_ID ?? "common"
    : process.env.MICROSOFT_TENANT_ID ?? "common";
  const encryptionEnv = isMail ? "EMAIL_TOKEN_ENCRYPTION_KEY" : "CALENDAR_TOKEN_ENCRYPTION_KEY";
  const scope = isMail ? "offline_access User.Read Mail.Read" : "offline_access User.Read Calendars.Read";

  if (!clientId || !clientSecret) {
    return {
      ok: false as const,
      error: isMail
        ? "Missing MICROSOFT_MAIL_CLIENT_ID/MICROSOFT_MAIL_CLIENT_SECRET or Microsoft fallback env."
        : "Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET.",
    };
  }

  return {
    ok: true as const,
    clientId,
    clientSecret,
    tenantId,
    encryptionEnv,
    scope,
  };
}

function isRefreshableProvider(provider: ConnectedAccount["provider"]): boolean {
  return ["google_calendar", "microsoft_calendar", "gmail", "microsoft_mail"].includes(provider);
}

function toSyncProvider(provider: ConnectedAccount["provider"]): SyncProvider {
  if (provider === "whatsapp_business" || provider === "whatsapp_business_cloud") {
    return "whatsapp";
  }

  return provider;
}
