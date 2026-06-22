import {
  getCachedIncomingMessages,
  getCachedTelegramMessages,
  getCachedWebsiteChatInboxMessages,
  getCachedWebsiteFormMessages,
  getCachedWhatsAppMessages,
  getSuggestedActions,
} from "@soreya/database";

import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

const MESSAGE_FETCH_LIMIT = 80;
const PENDING_FETCH_LIMIT = 200;

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organizationId = context.userOrganization.organization.id;
    const timezone = context.userOrganization.organization.default_timezone ?? "Europe/Rome";

    const [
      emailMessages,
      whatsappMessages,
      telegramMessages,
      websiteFormMessages,
      websiteChatMessages,
      pendingActions,
    ] = await Promise.all([
      getCachedIncomingMessages(context.supabase, organizationId, { limit: MESSAGE_FETCH_LIMIT }),
      getCachedWhatsAppMessages(context.supabase, organizationId, { limit: MESSAGE_FETCH_LIMIT }),
      getCachedTelegramMessages(context.supabase, organizationId, { limit: MESSAGE_FETCH_LIMIT }),
      getCachedWebsiteFormMessages(context.supabase, organizationId, { limit: MESSAGE_FETCH_LIMIT }),
      getCachedWebsiteChatInboxMessages(context.supabase, organizationId, { limit: MESSAGE_FETCH_LIMIT }),
      getSuggestedActions(context.supabase, organizationId, {
        statuses: ["pending_approval", "edited"],
        limit: PENDING_FETCH_LIMIT,
      }),
    ]);

    const receivedAtValues = [
      ...emailMessages.map((message) => message.receivedAt),
      ...whatsappMessages.map((message) => message.receivedAt),
      ...telegramMessages.map((message) => message.receivedAt),
      ...websiteFormMessages.map((message) => message.receivedAt),
      ...websiteChatMessages.map((message) => message.createdAt),
    ];

    const requestCount = receivedAtValues.filter((value) => isTodayInTimezone(value, timezone)).length;

    return Response.json({
      requestCount,
      pendingApprovals: pendingActions.length,
      timezone,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function isTodayInTimezone(value: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(value)) === formatter.format(new Date());
}
