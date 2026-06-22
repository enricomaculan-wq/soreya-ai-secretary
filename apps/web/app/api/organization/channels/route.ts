import { updateOrganizationAddedChannels } from "@soreya/database";
import {
  addSettingsChannel,
  isSettingsChannelId,
  removeSettingsChannel,
  SETTINGS_CHANNEL_IDS,
  type SettingsChannelId,
} from "@soreya/shared";

import { assertOrganizationAdmin } from "@/lib/server/brain-api";
import { jsonError } from "@/lib/server/approvals-api";
import {
  readAddedSettingsChannels,
  resolveSettingsChannelStatuses,
} from "@/lib/server/settings-channels-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const addedChannels = readAddedSettingsChannels(context);
    const statuses = await resolveSettingsChannelStatuses(context);

    return Response.json({
      addedChannels,
      availableChannels: SETTINGS_CHANNEL_IDS,
      statuses,
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
    const settings = context.userOrganization.organization.settings;
    let nextChannels: SettingsChannelId[];

    if (typeof body.add === "string" && isSettingsChannelId(body.add)) {
      nextChannels = addSettingsChannel(settings, body.add);
    } else if (typeof body.remove === "string" && isSettingsChannelId(body.remove)) {
      nextChannels = removeSettingsChannel(settings, body.remove);
    } else if (Array.isArray(body.addedChannels)) {
      nextChannels = body.addedChannels.filter(
        (entry): entry is SettingsChannelId => typeof entry === "string" && isSettingsChannelId(entry),
      );
    } else {
      return Response.json({ error: "Provide add, remove, or addedChannels." }, { status: 400 });
    }

    const result = await updateOrganizationAddedChannels(
      context.supabase,
      context.userOrganization.organization.id,
      nextChannels,
    );
    const statuses = await resolveSettingsChannelStatuses({
      ...context,
      userOrganization: {
        ...context.userOrganization,
        organization: result.organization,
      },
    });

    return Response.json({
      addedChannels: result.addedChannels,
      statuses,
    });
  } catch (error) {
    return jsonError(error);
  }
}
