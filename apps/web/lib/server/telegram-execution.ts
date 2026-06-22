import { getConnectedTelegramAccount, type SoreyaSupabaseClient } from "@soreya/database";
import type { Json } from "@soreya/shared";

import { decryptToken } from "@/lib/server/token-encryption";
import { readTelegramBotToken, sendTelegramMessage } from "@/lib/server/telegram-api";
import { normalizeTelegramRecipient } from "@/lib/server/telegram-chat-id";

export type SendTelegramTextInput = {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  recipientChatId: string;
  body: string;
};

export type SendTelegramTextResult = {
  providerMessageId: string | null;
  response: Json;
};

export async function sendTelegramTextMessage(input: SendTelegramTextInput): Promise<SendTelegramTextResult> {
  const account = await getConnectedTelegramAccount(input.supabase, input.organizationId);

  if (!account?.enabled) {
    throw new Error("Telegram bot is not enabled for this organization.");
  }

  const botToken = account?.accessTokenEncrypted
    ? decryptToken(account.accessTokenEncrypted, "TELEGRAM_BOT_TOKEN_ENCRYPTION_KEY")
    : readTelegramBotToken();

  const chatId = normalizeTelegramRecipient(input.recipientChatId);
  const result = await sendTelegramMessage(botToken, chatId, input.body);

  return {
    providerMessageId: result.providerMessageId,
    response: result.response as Json,
  };
}
