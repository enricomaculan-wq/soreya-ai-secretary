import { jsonError } from "@/lib/server/daily-summary-api";
import { safeNotificationType, sendNotificationToUser } from "@/lib/server/notifications";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const type = safeNotificationType(body.type);
    const title = readString(body.title);
    const notificationBody = readString(body.body);

    if (!type || !title || !notificationBody) {
      return Response.json({ error: "Safe type, title and body are required." }, { status: 400 });
    }

    const result = await sendNotificationToUser(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      type,
      title,
      body: notificationBody,
      data: {
        source: "protected_send_route",
      },
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
