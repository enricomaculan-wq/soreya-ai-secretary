import type { Json } from "@soreya/shared/json";
import { parseWebsiteFormSettings } from "@soreya/shared/website-form";

export type WebsiteChatSettings = {
  enabled: boolean;
};

export const DEFAULT_WEBSITE_CHAT_SETTINGS: WebsiteChatSettings = {
  enabled: false,
};

export function parseWebsiteChatSettings(settings: Json | null | undefined): WebsiteChatSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return DEFAULT_WEBSITE_CHAT_SETTINGS;
  }

  const record = settings as Record<string, Json | undefined>;
  const websiteChat = record.websiteChat;

  if (!websiteChat || typeof websiteChat !== "object" || Array.isArray(websiteChat)) {
    return DEFAULT_WEBSITE_CHAT_SETTINGS;
  }

  return {
    enabled: (websiteChat as Record<string, Json | undefined>).enabled === true,
  };
}

export function mergeWebsiteChatSettings(
  settings: Json | null | undefined,
  patch: Partial<WebsiteChatSettings>,
): Json {
  const current = parseWebsiteChatSettings(settings);

  return {
    ...(settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {}),
    websiteChat: {
      enabled: patch.enabled ?? current.enabled,
    },
  };
}

export function isWebsiteChatIngestEnabled(settings: Json | null | undefined): boolean {
  const chat = parseWebsiteChatSettings(settings);
  const form = parseWebsiteFormSettings(settings);
  return chat.enabled && Boolean(form.ingestToken);
}
