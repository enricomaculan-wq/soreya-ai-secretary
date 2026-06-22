import type { Json } from "./json.ts";

export type TelegramSettings = {
  enabled: boolean;
  webhookSecret: string | null;
  botTokenEncryptedRef: boolean;
};

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  enabled: false,
  webhookSecret: null,
  botTokenEncryptedRef: false,
};

export function parseTelegramSettings(settings: Json | null | undefined): TelegramSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return DEFAULT_TELEGRAM_SETTINGS;
  }

  const record = settings as Record<string, Json | undefined>;
  const telegram = record.telegram;

  if (!telegram || typeof telegram !== "object" || Array.isArray(telegram)) {
    return DEFAULT_TELEGRAM_SETTINGS;
  }

  const value = telegram as Record<string, Json | undefined>;

  return {
    enabled: value.enabled === true,
    webhookSecret:
      typeof value.webhookSecret === "string" && value.webhookSecret.trim().length > 0
        ? value.webhookSecret.trim()
        : null,
    botTokenEncryptedRef: value.botTokenEncryptedRef === true,
  };
}

export function mergeTelegramSettings(
  settings: Json | null | undefined,
  patch: Partial<TelegramSettings>,
): Json {
  const current = parseTelegramSettings(settings);

  return {
    ...(settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {}),
    telegram: {
      enabled: patch.enabled ?? current.enabled,
      webhookSecret: patch.webhookSecret !== undefined ? patch.webhookSecret : current.webhookSecret,
      botTokenEncryptedRef:
        patch.botTokenEncryptedRef !== undefined ? patch.botTokenEncryptedRef : current.botTokenEncryptedRef,
    },
  };
}
