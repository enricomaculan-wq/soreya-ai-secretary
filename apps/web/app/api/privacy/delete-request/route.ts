import { jsonError } from "@/lib/server/approvals-api";
import { recordPrivacyDeletionRequest } from "@/lib/server/privacy-api";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/privacy/delete-request", limit: 5 });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const context = await getAuthenticatedServerContext();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    await recordPrivacyDeletionRequest(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      reason,
    });

    return Response.json({
      status: "recorded",
      message:
        "Deletion request recorded. Operational data removal is completed manually after identity verification.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
