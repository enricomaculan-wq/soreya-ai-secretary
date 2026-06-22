import type { Json } from "./json.ts";

export const SETTINGS_CHANNEL_IDS = [
  "email-google",
  "calendar-google",
  "website-form",
  "website-chat",
  "whatsapp",
  "telegram",
  "email-microsoft",
  "calendar-microsoft",
] as const;

export type SettingsChannelId = (typeof SETTINGS_CHANNEL_IDS)[number];

export type SettingsChannelStatus = "active" | "setup" | "paused" | "error";

export function isSettingsChannelId(value: string): value is SettingsChannelId {
  return (SETTINGS_CHANNEL_IDS as readonly string[]).includes(value);
}

export function parseAddedSettingsChannels(settings: Json | null | undefined): SettingsChannelId[] {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return [];
  }

  const record = settings as Record<string, Json | undefined>;
  const addedChannels = record.addedChannels;

  if (!Array.isArray(addedChannels)) {
    return [];
  }

  return addedChannels.filter((entry): entry is SettingsChannelId => typeof entry === "string" && isSettingsChannelId(entry));
}

export function mergeAddedSettingsChannels(
  settings: Json | null | undefined,
  addedChannels: SettingsChannelId[],
): Json {
  const unique = SETTINGS_CHANNEL_IDS.filter((id) => addedChannels.includes(id));

  return {
    ...(settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {}),
    addedChannels: unique,
  };
}

export function addSettingsChannel(
  settings: Json | null | undefined,
  channelId: SettingsChannelId,
): SettingsChannelId[] {
  const current = parseAddedSettingsChannels(settings);

  if (current.includes(channelId)) {
    return current;
  }

  return [...current, channelId];
}

export function removeSettingsChannel(
  settings: Json | null | undefined,
  channelId: SettingsChannelId,
): SettingsChannelId[] {
  return parseAddedSettingsChannels(settings).filter((id) => id !== channelId);
}
