import { createAuditLog, getSuggestedActionById } from "@soreya/database";
import { z } from "zod";

import { jsonError } from "@/lib/server/approvals-api";
import { buildExecutionPreview } from "@/lib/server/execution-engine";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

const previewSchema = z.object({
  suggestedActionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = previewSchema.parse(await request.json());
    const action = await getSuggestedActionById(
      context.supabase,
      context.userOrganization.organization.id,
      body.suggestedActionId,
    );

    if (!action) {
      return jsonError(new Error("Suggested action not found."), 404);
    }

    const preview = buildExecutionPreview(action);

    await createAuditLog(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      eventName: "execution_previewed",
      entityTable: "suggested_actions",
      entityId: action.id,
      metadata: {
        suggestedActionId: action.id,
        actionType: action.action_type,
        status: action.status,
        executionType: preview.executionType,
        dryRun: preview.dryRun,
        canExecute: preview.canExecute,
      },
    });

    return Response.json({ preview, blocked: !preview.canExecute });
  } catch (error) {
    return jsonError(error, 400);
  }
}
