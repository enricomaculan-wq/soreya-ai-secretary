import { z } from "zod";

import { jsonError } from "@/lib/server/approvals-api";
import { executeSuggestedAction } from "@/lib/server/execution-engine";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

const executeSchema = z.object({
  suggestedActionId: z.string().uuid(),
  finalConfirmationText: z.string(),
});

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, { route: "/api/execution/execute", limit: 20 });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const context = await getAuthenticatedServerContext();
    const body = executeSchema.parse(await request.json());
    const result = await executeSuggestedAction(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      suggestedActionId: body.suggestedActionId,
      userId: context.user.id,
      finalConfirmationText: body.finalConfirmationText,
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
