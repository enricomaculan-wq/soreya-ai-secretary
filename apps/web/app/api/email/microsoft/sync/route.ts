import { jsonError } from "@/lib/server/email-api";
import { syncMicrosoftMail } from "@/lib/server/provider-sync";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST() {
  try {
    const context = await getAuthenticatedServerContext();
    const result = await syncMicrosoftMail(
      context.supabase,
      context.userOrganization.organization.id,
      context.userOrganization.organization.default_timezone,
    );
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
