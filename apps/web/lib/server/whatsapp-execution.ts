import { getConnectedWhatsAppAccount, type SoreyaSupabaseClient } from "@soreya/database";
import type { Json } from "@soreya/shared";

import { decryptToken } from "@/lib/server/token-encryption";
import { readWhatsAppAccessToken, readWhatsAppApiVersion } from "@/lib/server/whatsapp-api";
import { normalizeWhatsAppRecipient } from "@/lib/server/whatsapp-phone";

export type SendWhatsAppTextInput = {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  recipientPhone: string;
  body: string;
};

export type SendWhatsAppTextResult = {
  providerMessageId: string | null;
  response: Json;
};

export async function sendWhatsAppTextMessage(input: SendWhatsAppTextInput): Promise<SendWhatsAppTextResult> {
  const account = await getConnectedWhatsAppAccount(input.supabase, input.organizationId);
  const phoneNumberId = account?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!phoneNumberId) {
    throw new Error("WhatsApp phone number id is not configured for this organization.");
  }

  const accessToken = account?.accessTokenEncrypted
    ? decryptToken(account.accessTokenEncrypted, "WHATSAPP_TOKEN_ENCRYPTION_KEY")
    : readWhatsAppAccessToken();

  const to = normalizeWhatsAppRecipient(input.recipientPhone);
  const apiVersion = readWhatsAppApiVersion();
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: input.body,
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const errorMessage =
      typeof payload.error === "object"
      && payload.error
      && typeof (payload.error as { message?: string }).message === "string"
        ? (payload.error as { message: string }).message
        : `WhatsApp API request failed with status ${response.status}.`;

    throw new Error(errorMessage);
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const firstMessage = messages[0];
  const providerMessageId =
    firstMessage
    && typeof firstMessage === "object"
    && typeof (firstMessage as { id?: string }).id === "string"
      ? (firstMessage as { id: string }).id
      : null;

  return {
    providerMessageId,
    response: payload as Json,
  };
}
