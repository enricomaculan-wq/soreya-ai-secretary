import { jsonError, readWhatsAppApiVersion } from "@/lib/server/whatsapp-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const suggestedActionId = typeof body.suggestedActionId === "string" ? body.suggestedActionId : null;

    if (!suggestedActionId) {
      return Response.json({ error: "suggestedActionId is required." }, { status: 400 });
    }

    const { data: action, error } = await context.supabase
      .from("suggested_actions")
      .select("*")
      .eq("organization_id", context.userOrganization.organization.id)
      .eq("id", suggestedActionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!action) {
      return Response.json({ error: "Suggested action not found." }, { status: 404 });
    }

    if (action.action_type !== "send_whatsapp_reply") {
      return Response.json({ error: "Suggested action is not a WhatsApp reply." }, { status: 400 });
    }

    if (action.status !== "approved") {
      return Response.json({ error: "WhatsApp reply must be approved before sending." }, { status: 409 });
    }

    return Response.json({
      provider: "whatsapp_business_cloud",
      apiVersion: readWhatsAppApiVersion(),
      status: "disabled",
      message: "WhatsApp sending is disabled until final approval implementation.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
