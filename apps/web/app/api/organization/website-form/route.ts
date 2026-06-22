import { updateOrganizationWebsiteFormSettings } from "@soreya/database";
import { parseWebsiteFormSettings } from "@soreya/shared";

import { generateWebsiteFormToken, buildWebsiteFormEmbedSnippet } from "@/lib/server/website-form-api";
import { assertOrganizationAdmin } from "@/lib/server/brain-api";
import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organization = context.userOrganization.organization;
    const websiteForm = parseWebsiteFormSettings(organization.settings);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

    return Response.json({
      enabled: websiteForm.enabled,
      hasToken: Boolean(websiteForm.ingestToken),
      organizationSlug: organization.slug,
      endpointUrl: `${origin}/api/website/form`,
      embedSnippet: buildWebsiteFormEmbedSnippet(origin, organization.slug),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    assertOrganizationAdmin(context.userOrganization.membership.role);
    const body = (await request.json()) as Record<string, unknown>;
    const regenerateToken = body.regenerateToken === true;
    const enabled = body.enabled === true;
    const current = parseWebsiteFormSettings(context.userOrganization.organization.settings);
    const ingestToken = regenerateToken || !current.ingestToken
      ? generateWebsiteFormToken()
      : current.ingestToken;

    const result = await updateOrganizationWebsiteFormSettings(
      context.supabase,
      context.userOrganization.organization.id,
      {
        enabled: body.enabled === undefined ? current.enabled : enabled,
        ingestToken,
      },
    );

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

    return Response.json({
      enabled: result.websiteForm.enabled,
      ingestToken: result.websiteForm.ingestToken,
      organizationSlug: result.organization.slug,
      endpointUrl: `${origin}/api/website/form`,
      embedSnippet: buildWebsiteFormEmbedSnippet(origin, result.organization.slug),
    });
  } catch (error) {
    return jsonError(error);
  }
}
