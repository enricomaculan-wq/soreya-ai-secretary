import { upsertNotificationToken } from "@soreya/database";
import type { DeviceCapability, DeviceType, SmartwatchPlatform } from "@soreya/shared";

import { jsonError } from "@/lib/server/daily-summary-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const expoPushToken = readString(body.expoPushToken);
    const platform = readPlatform(body.platform);

    if (!expoPushToken || !platform) {
      return Response.json({ error: "expoPushToken and platform are required." }, { status: 400 });
    }

    const token = await upsertNotificationToken(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      userId: context.user.id,
      expoPushToken,
      platform,
      deviceType: readDeviceType(body.deviceType) ?? (platform === "web" ? "web" : "mobile"),
      smartwatchPlatform: readSmartwatchPlatform(body.smartwatchPlatform) ?? "unknown",
      capabilities: readCapabilities(body.capabilities),
      deviceName: readString(body.deviceName),
      appVersion: readString(body.appVersion),
      metadata: {
        registeredFrom: "api",
      },
    });

    return Response.json({ token });
  } catch (error) {
    return jsonError(error, 400);
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPlatform(value: unknown): "ios" | "android" | "web" | null {
  return value === "ios" || value === "android" || value === "web" ? value : null;
}

function readDeviceType(value: unknown): DeviceType | null {
  return value === "web" || value === "mobile" || value === "smartwatch" ? value : null;
}

function readSmartwatchPlatform(value: unknown): SmartwatchPlatform | null {
  return value === "apple_watch" || value === "wear_os" || value === "unknown" ? value : null;
}

function readCapabilities(value: unknown): DeviceCapability[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is DeviceCapability =>
    item === "push_notifications"
    || item === "actionable_notifications"
    || item === "quick_approve"
    || item === "quick_ignore"
    || item === "emergency_shortcuts"
    || item === "daily_summary_glance"
    || item === "open_mobile_deeplink",
  );
}
