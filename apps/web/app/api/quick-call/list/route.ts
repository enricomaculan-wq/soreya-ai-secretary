import { getQuickCallNotes } from "@soreya/database";
import type { QuickCallIntentType, QuickCallNoteStatus } from "@soreya/shared";

import { quickCallJsonError } from "@/lib/server/quick-call-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as QuickCallNoteStatus | null;
    const intentType = url.searchParams.get("intentType") as QuickCallIntentType | null;
    const notes = await getQuickCallNotes(context.supabase, context.userOrganization.organization.id, {
      statuses: status ? [status] : undefined,
      intentTypes: intentType ? [intentType] : undefined,
      limit: Number(url.searchParams.get("limit") ?? 20),
    });

    return Response.json({ notes });
  } catch (error) {
    return quickCallJsonError(error);
  }
}
