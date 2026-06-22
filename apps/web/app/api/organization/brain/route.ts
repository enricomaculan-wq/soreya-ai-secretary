import {
  getOrganizationBrainContext,
  updateOrganizationBrainSettings,
} from "@soreya/database";

import { assertOrganizationAdmin, parseBrainSettingsBody } from "@/lib/server/brain-api";
import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const brain = await getOrganizationBrainContext(
      context.supabase,
      context.userOrganization.organization.id,
    );

    return Response.json(brain);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    assertOrganizationAdmin(context.userOrganization.membership.role);
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updateOrganizationBrainSettings(
      context.supabase,
      context.userOrganization.organization.id,
      parseBrainSettingsBody(body),
    );

    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
