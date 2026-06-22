import {
  getCalendarConnectionStatuses,
  getEmailConnectionStatuses,
  getTelegramConnectionStatus,
  getWhatsAppConnectionStatus,
} from "@soreya/database";
import {
  isWebsiteChatIngestEnabled,
  parseAddedSettingsChannels,
  parseWebsiteChatSettings,
  parseWebsiteFormSettings,
  type SettingsChannelId,
  type SettingsChannelStatus,
} from "@soreya/shared";

import type { getAuthenticatedServerContext } from "@/lib/server/supabase";

type ServerContext = Awaited<ReturnType<typeof getAuthenticatedServerContext>>;

export async function resolveSettingsChannelStatuses(
  context: ServerContext,
): Promise<Record<SettingsChannelId, SettingsChannelStatus>> {
  const organizationId = context.userOrganization.organization.id;
  const settings = context.userOrganization.organization.settings;

  const [emailStatuses, calendarStatuses, whatsappStatus, telegramStatus] = await Promise.all([
    getEmailConnectionStatuses(context.supabase, organizationId),
    getCalendarConnectionStatuses(context.supabase, organizationId),
    getWhatsAppConnectionStatus(context.supabase, organizationId),
    getTelegramConnectionStatus(context.supabase, organizationId),
  ]);

  const gmail = emailStatuses.find((row) => row.provider === "gmail");
  const microsoftMail = emailStatuses.find((row) => row.provider === "microsoft");
  const googleCalendar = calendarStatuses.find((row) => row.provider === "google");
  const microsoftCalendar = calendarStatuses.find((row) => row.provider === "microsoft");
  const websiteForm = parseWebsiteFormSettings(settings);
  const websiteChat = parseWebsiteChatSettings(settings);

  const mapConnection = (connected: boolean, hasError: boolean): SettingsChannelStatus => {
    if (hasError) {
      return "error";
    }

    return connected ? "active" : "setup";
  };

  return {
    "email-google": mapConnection(Boolean(gmail?.connected), gmail?.status === "error"),
    "calendar-google": mapConnection(Boolean(googleCalendar?.connected), googleCalendar?.status === "error"),
    "website-form": websiteForm.enabled && websiteForm.ingestToken ? "active" : "setup",
    "website-chat": isWebsiteChatIngestEnabled(settings) ? "active" : websiteChat.enabled ? "setup" : "setup",
    whatsapp: mapConnection(whatsappStatus.connected, whatsappStatus.status === "error"),
    telegram: mapConnection(telegramStatus.connected, telegramStatus.status === "error"),
    "email-microsoft": mapConnection(Boolean(microsoftMail?.connected), microsoftMail?.status === "error"),
    "calendar-microsoft": mapConnection(Boolean(microsoftCalendar?.connected), microsoftCalendar?.status === "error"),
  };
}

export function readAddedSettingsChannels(context: ServerContext) {
  return parseAddedSettingsChannels(context.userOrganization.organization.settings);
}
