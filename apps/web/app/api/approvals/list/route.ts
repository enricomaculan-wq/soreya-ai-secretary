import { getSuggestedActions } from "@soreya/database";

import { jsonError, parseActionTypes, parseStatuses } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const url = new URL(request.url);
    const actions = await getSuggestedActions(context.supabase, context.userOrganization.organization.id, {
      statuses: parseStatuses(url.searchParams.get("statuses")) ?? ["pending_approval", "edited", "approved"],
      actionTypes: parseActionTypes(url.searchParams.get("actionTypes")),
      limit: Number(url.searchParams.get("limit") ?? 50),
    });

    return Response.json({ actions });
  } catch (error) {
    return jsonError(error);
  }
}
