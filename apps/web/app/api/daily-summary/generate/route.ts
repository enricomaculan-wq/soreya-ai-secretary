import { generateDailySummaryForOrganization } from "@/lib/server/daily-summary";
import { jsonError } from "@/lib/server/daily-summary-api";
import { notifyDailySummaryReady } from "@/lib/server/notifications";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { buildSmartwatchDailySummaryNotification } from "@/lib/server/watch-notifications";

export async function POST() {
  try {
    const context = await getAuthenticatedServerContext();
    const summary = await generateDailySummaryForOrganization(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      defaultTimezone: context.userOrganization.organization.default_timezone,
    });
    notifyDailySummaryReady(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      smartwatchPayload: buildSmartwatchDailySummaryNotification(summary),
      data: {
        summaryId: summary.id,
        summaryDate: summary.summaryDate,
      },
    }).catch(() => undefined);

    return Response.json({ summary });
  } catch (error) {
    return jsonError(error, 400);
  }
}
