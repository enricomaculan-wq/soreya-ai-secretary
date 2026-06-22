import { updateOrganizationWebsiteChatSettings } from "@soreya/database";
import { isWebsiteChatIngestEnabled, parseWebsiteChatSettings, parseWebsiteFormSettings } from "@soreya/shared";

import { assertOrganizationAdmin } from "@/lib/server/brain-api";
import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { buildWebsiteChatEmbedSnippet } from "@/lib/server/website-chat-api";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const organization = context.userOrganization.organization;
    const websiteChat = parseWebsiteChatSettings(organization.settings);
    const websiteForm = parseWebsiteFormSettings(organization.settings);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

    return Response.json({
      enabled: websiteChat.enabled,
      hasFormToken: Boolean(websiteForm.ingestToken),
      ingestReady: isWebsiteChatIngestEnabled(organization.settings),
      organizationSlug: organization.slug,
      sessionEndpointUrl: `${origin}/api/website/chat/session`,
      messageEndpointUrl: `${origin}/api/website/chat/message`,
      pollEndpointUrl: `${origin}/api/website/chat/messages`,
      embedSnippet: buildWebsiteChatEmbedSnippet(origin, organization.slug),
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
    const current = parseWebsiteChatSettings(context.userOrganization.organization.settings);
    const enabled = body.enabled === true;

    const result = await updateOrganizationWebsiteChatSettings(
      context.supabase,
      context.userOrganization.organization.id,
      {
        enabled: body.enabled === undefined ? current.enabled : enabled,
      },
    );

    const websiteForm = parseWebsiteFormSettings(result.organization.settings);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

    return Response.json({
      enabled: result.websiteChat.enabled,
      hasFormToken: Boolean(websiteForm.ingestToken),
      ingestReady: isWebsiteChatIngestEnabled(result.organization.settings),
      organizationSlug: result.organization.slug,
      sessionEndpointUrl: `${origin}/api/website/chat/session`,
      messageEndpointUrl: `${origin}/api/website/chat/message`,
      pollEndpointUrl: `${origin}/api/website/chat/messages`,
      embedSnippet: buildWebsiteChatEmbedSnippet(origin, result.organization.slug),
    });
  } catch (error) {
    return jsonError(error);
  }
}
