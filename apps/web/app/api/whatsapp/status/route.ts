import { getConnectedWhatsAppAccount, getWhatsAppConnectionStatus } from "@soreya/database";

import { jsonError } from "@/lib/server/whatsapp-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organizationId = context.userOrganization.organization.id;
    const [status, account] = await Promise.all([
      getWhatsAppConnectionStatus(context.supabase, organizationId),
      getConnectedWhatsAppAccount(context.supabase, organizationId),
    ]);

    return Response.json({
      ...status,
      phoneNumberId: account?.phoneNumberId ?? null,
      verifiedName: account?.verifiedName ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
