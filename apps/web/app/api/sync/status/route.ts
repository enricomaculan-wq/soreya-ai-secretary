import {
  getCalendarConnectionStatuses,
  getEmailConnectionStatuses,
  getRecentSyncLogs,
  getWhatsAppConnectionStatus,
} from "@soreya/database";

import { jsonError } from "@/lib/server/email-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organizationId = context.userOrganization.organization.id;
    const [syncLogs, calendar, email, whatsapp] = await Promise.all([
      getRecentSyncLogs(context.supabase, organizationId, { limit: 20 }),
      getCalendarConnectionStatuses(context.supabase, organizationId),
      getEmailConnectionStatuses(context.supabase, organizationId),
      getWhatsAppConnectionStatus(context.supabase, organizationId),
    ]);

    return Response.json({
      syncLogs,
      connections: {
        calendar,
        email,
        whatsapp,
      },
      readOnly: true,
      message: "Sync reads messages and calendars only. It does not send or modify anything.",
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
