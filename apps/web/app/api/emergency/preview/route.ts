import { buildEmergencyPreview, jsonError, normalizeEmergencyRequest } from "@/lib/server/emergency-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { z } from "zod";

const emergencySchema = z.object({
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
    const body = emergencySchema.parse(await request.json());
    const emergencyRequest = normalizeEmergencyRequest(body);
    const result = await buildEmergencyPreview(
      context.supabase,
      context.userOrganization.organization.id,
      emergencyRequest,
    );

    return Response.json(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
