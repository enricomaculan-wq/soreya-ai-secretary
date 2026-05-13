import { editSuggestedAction } from "@soreya/database";

import { jsonError, readJsonPayload, readOptionalString, readString } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const action = await editSuggestedAction(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      suggestedActionId: readString(body.suggestedActionId, "suggestedActionId"),
      userId: context.user.id,
      draftPayload: readJsonPayload(body.draftPayload, "draftPayload"),
      title: readOptionalString(body.title),
      rationale: readOptionalString(body.rationale),
      note: readOptionalString(body.note),
    });

    return Response.json({ action });
  } catch (error) {
    return jsonError(error, 400);
  }
}
