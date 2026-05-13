import { ignoreQuickCallNote } from "@soreya/database";

import { quickCallJsonError } from "@/lib/server/quick-call-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const callNoteId = typeof body.callNoteId === "string" ? body.callNoteId : null;

    if (!callNoteId) {
      return Response.json({ error: "callNoteId is required." }, { status: 400 });
    }

    const callNote = await ignoreQuickCallNote(
      context.supabase,
      context.userOrganization.organization.id,
      callNoteId,
    );

    return Response.json({ callNote });
  } catch (error) {
    return quickCallJsonError(error, 400);
  }
}
