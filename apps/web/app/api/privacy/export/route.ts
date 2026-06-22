import { jsonError } from "@/lib/server/approvals-api";
import { buildPrivacyExport } from "@/lib/server/privacy-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organization = context.userOrganization.organization;
    const membership = context.userOrganization.membership;

    const exportPayload = await buildPrivacyExport(context.supabase, {
      organizationId: organization.id,
      userId: context.user.id,
      userEmail: context.user.email ?? null,
      organizationName: organization.name,
      membershipRole: membership.role,
    });

    return Response.json(exportPayload);
  } catch (error) {
    return jsonError(error);
  }
}
