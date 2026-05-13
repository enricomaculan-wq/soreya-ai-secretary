import { getEmergencyActions } from "@soreya/database";

import { jsonError } from "@/lib/server/emergency-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const url = new URL(request.url);
    const actions = await getEmergencyActions(context.supabase, context.userOrganization.organization.id, {
      targetDate: url.searchParams.get("targetDate") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 20),
    });

    return Response.json({ actions });
  } catch (error) {
    return jsonError(error);
  }
}
