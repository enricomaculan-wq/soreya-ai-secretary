import type { OrganizationBrainSettings, OrganizationRole } from "@soreya/shared";

import { ServerAuthError } from "@/lib/server/supabase";

const adminRoles: OrganizationRole[] = ["owner", "admin"];

export function assertOrganizationAdmin(role: OrganizationRole) {
  if (!adminRoles.includes(role)) {
    throw new ServerAuthError("Only organization owners or admins can manage Brain settings.", 403);
  }
}

export function parseBrainSettingsBody(body: Record<string, unknown>): OrganizationBrainSettings {
  return {
    reasoningMode:
      body.reasoningMode === "conservative" || body.reasoningMode === "balanced" || body.reasoningMode === "proactive"
        ? body.reasoningMode
        : "balanced",
    defaultReplyTone:
      body.defaultReplyTone === "professional"
      || body.defaultReplyTone === "friendly"
      || body.defaultReplyTone === "short"
      || body.defaultReplyTone === "apologetic"
        ? body.defaultReplyTone
        : "professional",
    requireServiceBeforeSlots: body.requireServiceBeforeSlots === true,
    requireExplicitDate: body.requireExplicitDate !== false,
    ownerStyleNotes:
      typeof body.ownerStyleNotes === "string" && body.ownerStyleNotes.trim().length > 0
        ? body.ownerStyleNotes.trim()
        : null,
  };
}
