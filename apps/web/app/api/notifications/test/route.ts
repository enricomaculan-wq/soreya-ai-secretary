import { jsonError } from "@/lib/server/daily-summary-api";
import { sendNotificationToUser } from "@/lib/server/notifications";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST() {
  try {
    const context = await getAuthenticatedServerContext();
    const result = await sendNotificationToUser(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      type: "system",
      title: "Soreya notification test",
      body: "Notifications only alert you. They never approve, send messages or modify calendars.",
      data: { source: "test_route" },
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
