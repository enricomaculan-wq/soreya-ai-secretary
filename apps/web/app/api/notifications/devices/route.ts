import {
  getNotificationPreferences,
  getRegisteredDevicesForUser,
  getSmartwatchCapableDevices,
  upsertNotificationPreferences,
} from "@soreya/database";

import { jsonError, readBoolean } from "@/lib/server/daily-summary-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organizationId = context.userOrganization.organization.id;
    const userId = context.user.id;
    const [devices, smartwatchCapableDevices, preferences] = await Promise.all([
      getRegisteredDevicesForUser(context.supabase, organizationId, userId),
      getSmartwatchCapableDevices(context.supabase, organizationId, userId),
      getNotificationPreferences(context.supabase, organizationId, userId),
    ]);

    return Response.json({
      devices,
      smartwatchCapableDevices,
      preferences,
      safetyCopy: "Smartwatch approval is not execution. Soreya still requires final confirmation before sending messages or modifying calendars.",
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const preferences = await upsertNotificationPreferences(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      watchFriendlyNotificationsEnabled: readBoolean(body.watchFriendlyNotificationsEnabled),
      allowQuickApproveFromWatch: readBoolean(body.allowQuickApproveFromWatch),
      allowQuickIgnoreFromWatch: readBoolean(body.allowQuickIgnoreFromWatch),
      showDailySummaryOnWatch: readBoolean(body.showDailySummaryOnWatch),
      emergencyShortcutsOnWatch: readBoolean(body.emergencyShortcutsOnWatch),
    });

    return Response.json({ preferences });
  } catch (error) {
    return jsonError(error, 400);
  }
}
