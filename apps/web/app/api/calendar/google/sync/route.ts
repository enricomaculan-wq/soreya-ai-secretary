import { jsonError } from "@/lib/server/calendar-api";
import { syncGoogleCalendar } from "@/lib/server/provider-sync";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST() {
  try {
    const context = await getAuthenticatedServerContext();
    const result = await syncGoogleCalendar(context.supabase, context.userOrganization.organization.id);
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
