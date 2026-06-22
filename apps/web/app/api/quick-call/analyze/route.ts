import { buildQuickCallPreview, quickCallJsonError, readQuickCallRawText } from "@/lib/server/quick-call-api";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { z } from "zod";

const quickCallSchema = z.object({
  rawText: z.string().trim().min(3).max(8000),
});

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/quick-call/analyze", limit: 20 });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const context = await getAuthenticatedServerContext();
    const body = quickCallSchema.parse(await request.json());
    const rawText = readQuickCallRawText(body);
    const result = await buildQuickCallPreview(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      rawText,
      timezone: context.userOrganization.organization.default_timezone,
    });

    return Response.json(result);
  } catch (error) {
    return quickCallJsonError(error, 400);
  }
}
