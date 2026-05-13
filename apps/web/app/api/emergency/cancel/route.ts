import { updateEmergencyActionStatus } from "@soreya/database";

import { jsonError } from "@/lib/server/emergency-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const emergencyActionId = typeof body.emergencyActionId === "string" ? body.emergencyActionId : null;

    if (!emergencyActionId) {
      return Response.json({ error: "emergencyActionId is required." }, { status: 400 });
    }

    const action = await updateEmergencyActionStatus(
      context.supabase,
      context.userOrganization.organization.id,
      emergencyActionId,
      "cancelled",
    );
    const { error } = await context.supabase
      .from("suggested_actions")
      .update({ status: "ignored" })
      .eq("organization_id", context.userOrganization.organization.id)
      .eq("emergency_action_id", emergencyActionId)
      .in("status", ["pending_approval", "edited"]);

    if (error) {
      throw error;
    }

    return Response.json({ action });
  } catch (error) {
    return jsonError(error, 400);
  }
}
