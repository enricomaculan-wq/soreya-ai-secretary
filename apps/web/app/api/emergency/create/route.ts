import { jsonError, normalizeEmergencyRequest, persistEmergencyPlan } from "@/lib/server/emergency-api";
import { notifyEmergencyActionsCreated } from "@/lib/server/notifications";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { buildSmartwatchEmergencyNotification } from "@/lib/server/watch-notifications";
import { z } from "zod";

const emergencyCreateSchema = z.object({
  type: z.enum([
    "pause_automation",
    "disconnect_channel",
    "block_contact",
    "notify_owner",
    "lock_external_sends",
    "reschedule_all_today",
    "reschedule_morning",
    "reschedule_afternoon",
    "notify_delay",
    "block_today",
    "notify_all_today",
  ]),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(3).max(1000),
  delayMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  messageTone: z.enum(["professional", "friendly", "short", "apologetic"]).optional(),
  targetWindow: z.enum(["all_day", "morning", "afternoon"]).optional(),
  customMessage: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = emergencyCreateSchema.parse(await request.json());
    const emergencyRequest = normalizeEmergencyRequest(body);
    const result = await persistEmergencyPlan(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      request: emergencyRequest,
    });
    notifyEmergencyActionsCreated(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      count: result.suggestedActions.length,
      smartwatchPayload: result.emergencyAction
        ? buildSmartwatchEmergencyNotification(result.emergencyAction)
        : undefined,
      data: {
        emergencyActionId: result.emergencyAction?.id ?? null,
      },
    }).catch(() => undefined);

    return Response.json(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
