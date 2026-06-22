import { NextResponse } from "next/server";

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}

export function readTelegramWebhookSecret(env: NodeJS.ProcessEnv = process.env) {
  return env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? null;
}

export function readTelegramBotToken(inputToken?: string | null) {
  const token = inputToken?.trim() || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing Telegram bot token. Provide botToken or set TELEGRAM_BOT_TOKEN.");
  }

  return token;
}

export function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export type TelegramBotProfile = {
  id: number;
  isBot: boolean;
  firstName: string;
  username: string | null;
};

export type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

export async function getTelegramBotMe(botToken: string): Promise<TelegramBotProfile> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const payload = (await response.json().catch(() => ({}))) as TelegramApiResponse<{
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  }>;

  if (!response.ok || !payload.ok || !payload.result) {
    throw new Error(payload.description ?? `Telegram getMe failed with status ${response.status}.`);
  }

  return {
    id: payload.result.id,
    isBot: payload.result.is_bot,
    firstName: payload.result.first_name,
    username: payload.result.username ?? null,
  };
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string | null,
): Promise<void> {
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message"],
  };

  if (secretToken) {
    body.secret_token = secretToken;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as TelegramApiResponse<boolean>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram setWebhook failed with status ${response.status}.`);
  }
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ providerMessageId: string | null; response: Record<string, unknown> }> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as TelegramApiResponse<{
    message_id?: number;
  }>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram sendMessage failed with status ${response.status}.`);
  }

  return {
    providerMessageId:
      typeof payload.result?.message_id === "number" ? String(payload.result.message_id) : null,
    response: payload as Record<string, unknown>,
  };
}
