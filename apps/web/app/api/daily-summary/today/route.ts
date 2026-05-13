import { getDailySummary } from "@soreya/database";

import { dateKeyForTimezone, ensureDailySummarySettings, generateDailySummaryForOrganization } from "@/lib/server/daily-summary";
import { jsonError } from "@/lib/server/daily-summary-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organization = context.userOrganization.organization;
    const settings = await ensureDailySummarySettings(context.supabase, {
      organizationId: organization.id,
      userId: context.user.id,
      defaultTimezone: organization.default_timezone,
    });
    const summaryDate = dateKeyForTimezone(settings.timezone);
    const existing = await getDailySummary(context.supabase, organization.id, summaryDate);
    const summary = existing ?? await generateDailySummaryForOrganization(context.supabase, {
      organizationId: organization.id,
      userId: context.user.id,
      defaultTimezone: organization.default_timezone,
    });

    return Response.json({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
