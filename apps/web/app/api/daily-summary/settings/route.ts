import { upsertDailySummarySettings } from "@soreya/database";

import { ensureDailySummarySettings } from "@/lib/server/daily-summary";
import { jsonError, readBoolean, readString } from "@/lib/server/daily-summary-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { z } from "zod";

const dailySummarySettingsSchema = z.object({
  enabled: z.boolean().optional(),
  deliveryTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  includeCalendar: z.boolean().optional(),
  includePendingApprovals: z.boolean().optional(),
  includeUnhandledMessages: z.boolean().optional(),
  includeFreeSlots: z.boolean().optional(),
});

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const settings = await ensureDailySummarySettings(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      defaultTimezone: context.userOrganization.organization.default_timezone,
    });

    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = dailySummarySettingsSchema.parse(await request.json());
    const settings = await upsertDailySummarySettings(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      enabled: readBoolean(body.enabled),
      deliveryTime: readString(body.deliveryTime),
      timezone: readString(body.timezone),
      includeCalendar: readBoolean(body.includeCalendar),
      includePendingApprovals: readBoolean(body.includePendingApprovals),
      includeUnhandledMessages: readBoolean(body.includeUnhandledMessages),
      includeFreeSlots: readBoolean(body.includeFreeSlots),
    });

    return Response.json({ settings });
  } catch (error) {
    return jsonError(error, 400);
  }
}
