import { getConnectedTelegramAccount, getTelegramConnectionStatus } from "@soreya/database";

import { jsonError } from "@/lib/server/telegram-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organizationId = context.userOrganization.organization.id;
    const [status, account] = await Promise.all([
      getTelegramConnectionStatus(context.supabase, organizationId),
      getConnectedTelegramAccount(context.supabase, organizationId),
    ]);

    return Response.json({
      ...status,
      botUserId: account?.botUserId ?? null,
      botUsername: account?.botUsername ?? null,
      displayName: account?.displayName ?? null,
      enabled: account?.enabled ?? false,
      webhookSecret: account?.webhookSecret ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
