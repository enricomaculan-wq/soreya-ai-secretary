import { getConnectedEmailAccountByProvider, type SoreyaSupabaseClient } from "@soreya/database";
import type { ConnectedAccount, Json } from "@soreya/shared";

import { GMAIL_SEND_SCOPE } from "@/lib/server/email-api";
import { buildMimeEmailPlainText, encodeGmailRaw } from "@/lib/server/email-mime";
import { decryptToken } from "@/lib/server/token-encryption";
import { refreshAccountTokenIfNeeded } from "@/lib/server/token-refresh";

export type SendGmailReplyInput = {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  recipient: string;
  subject: string;
  body: string;
  inReplyToMessageId?: string | null;
  threadId?: string | null;
};

export type SendGmailReplyResult = {
  providerMessageId: string | null;
  threadId: string | null;
  response: Json;
};

export async function sendGmailReply(input: SendGmailReplyInput): Promise<SendGmailReplyResult> {
  const account = await getConnectedEmailAccountByProvider(input.supabase, input.organizationId, "gmail");

  if (!account) {
    throw new Error("Gmail is not connected for this organization.");
  }

  if (!account.scopes.includes(GMAIL_SEND_SCOPE)) {
    throw new Error(
      "Gmail send scope is missing. Disconnect and reconnect Gmail from Settings to grant send permission.",
    );
  }

  const rawAccount = await readConnectedAccountRow(input.supabase, account.id);
  const refreshResult = await refreshAccountTokenIfNeeded(input.supabase, rawAccount);

  if (refreshResult.errorMessage) {
    throw new Error(refreshResult.errorMessage);
  }

  const refreshedAccount = await getConnectedEmailAccountByProvider(input.supabase, input.organizationId, "gmail");

  if (!refreshedAccount?.accessTokenEncrypted) {
    throw new Error("Gmail access token is missing.");
  }

  if (!refreshedAccount.email) {
    throw new Error("Connected Gmail account has no email address.");
  }

  const accessToken = decryptToken(refreshedAccount.accessTokenEncrypted, "EMAIL_TOKEN_ENCRYPTION_KEY");
  let threadId = input.threadId ?? null;
  let inReplyTo: string | null = null;
  let references: string | null = null;

  if (input.inReplyToMessageId) {
    const original = await fetchGmailMessage(accessToken, input.inReplyToMessageId);
    threadId = threadId ?? original.threadId;
    inReplyTo = original.messageId;
    references = original.references ?? original.messageId;
  }

  const rawMessage = buildMimeEmailPlainText({
    fromEmail: refreshedAccount.email,
    fromName: refreshedAccount.displayName,
    to: input.recipient,
    subject: input.subject,
    body: input.body,
    inReplyTo,
    references,
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodeGmailRaw(rawMessage),
      threadId: threadId ?? undefined,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const errorMessage =
      typeof payload.error === "object"
      && payload.error
      && typeof (payload.error as { message?: string }).message === "string"
        ? (payload.error as { message: string }).message
        : `Gmail send failed with status ${response.status}.`;

    throw new Error(errorMessage);
  }

  return {
    providerMessageId: typeof payload.id === "string" ? payload.id : null,
    threadId: typeof payload.threadId === "string" ? payload.threadId : threadId,
    response: payload as Json,
  };
}

async function fetchGmailMessage(accessToken: string, messageId: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorMessage =
      typeof payload.error === "object"
      && payload.error
      && typeof (payload.error as { message?: string }).message === "string"
        ? (payload.error as { message: string }).message
        : `Unable to load Gmail message ${messageId}.`;

    throw new Error(errorMessage);
  }

  const headers = readGmailMetadataHeaders(payload.payload);

  return {
    threadId: typeof payload.threadId === "string" ? payload.threadId : null,
    messageId: headers["message-id"] ?? null,
    references: headers.references ?? null,
  };
}

function readGmailMetadataHeaders(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const headers = (payload as { headers?: Array<{ name?: string; value?: string }> }).headers ?? [];
  const result: Record<string, string> = {};

  for (const header of headers) {
    if (header.name && header.value) {
      result[header.name.toLowerCase()] = header.value;
    }
  }

  return result;
}

async function readConnectedAccountRow(
  supabase: SoreyaSupabaseClient,
  accountId: string,
): Promise<ConnectedAccount> {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
