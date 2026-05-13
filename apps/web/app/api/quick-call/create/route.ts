import { persistQuickCallPlan, quickCallJsonError, readQuickCallRawText } from "@/lib/server/quick-call-api";
import { notifyPendingApprovalCreated } from "@/lib/server/notifications";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { z } from "zod";
import {
  buildSmartwatchPendingApprovalNotification,
  buildSmartwatchQuickCallNotification,
} from "@/lib/server/watch-notifications";

const quickCallCreateSchema = z.object({
  rawText: z.string().trim().min(3).max(8000),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = quickCallCreateSchema.parse(await request.json());
    const rawText = readQuickCallRawText(body);
    const result = await persistQuickCallPlan(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      rawText,
      timezone: context.userOrganization.organization.default_timezone,
    });
    const smartwatchAction = firstPersistedSuggestedAction(result.suggestedActions);
    notifyPendingApprovalCreated(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      count: result.suggestedActions.length,
      smartwatchPayload: smartwatchAction
        ? buildSmartwatchPendingApprovalNotification(smartwatchAction, {
            organizationId: context.userOrganization.organization.id,
            userId: context.user.id,
          })
        : result.callNote
          ? buildSmartwatchQuickCallNotification(result.callNote)
          : undefined,
      data: {
        callNoteId: result.callNote?.id ?? null,
        source: "quick_call",
      },
    }).catch(() => undefined);

    return Response.json(result);
  } catch (error) {
    return quickCallJsonError(error, 400);
  }
}

function firstPersistedSuggestedAction(actions: unknown[]) {
  return actions.find((action): action is {
    id: string;
    title: string;
    action_type: Parameters<typeof buildSmartwatchPendingApprovalNotification>[0]["action_type"];
    risk_level: Parameters<typeof buildSmartwatchPendingApprovalNotification>[0]["risk_level"];
  } =>
    Boolean(
      action
      && typeof action === "object"
      && "id" in action
      && "title" in action
      && "action_type" in action,
    ),
  );
}
