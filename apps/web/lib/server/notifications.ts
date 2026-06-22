import {
  getNotificationPreferences,
  getNotificationTokensForUser,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import { SOREYA_DEEP_LINKS, type Json, type NotificationPayload, type NotificationType, type SmartwatchNotificationPayload } from "@soreya/shared";

import {
  buildWebsiteInboundNotificationPayload,
  type WebsiteInboundChannel,
} from "@/lib/server/website-inbound-notifications";
import { SMARTWATCH_SAFETY_COPY } from "@/lib/server/watch-notifications";

export type ExpoNotificationResult = {
  enabled: boolean;
  sent: number;
  disabled: boolean;
  tickets: Json[];
};

export type SendNotificationInput = {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Json;
  smartwatchPayload?: SmartwatchNotificationPayload;
};

const SAFE_NOTIFICATION_TYPES: NotificationType[] = [
  "pending_approval",
  "daily_summary_ready",
  "emergency_actions_created",
  "appointment_request_detected",
  "quick_call_created",
  "system",
];

export function pushNotificationsEnabled(): boolean {
  return process.env.ENABLE_PUSH_NOTIFICATIONS === "true";
}

export async function sendExpoPushNotification(input: {
  expoPushToken: string;
  payload: NotificationPayload;
}): Promise<ExpoNotificationResult> {
  if (!pushNotificationsEnabled()) {
    return disabledResult();
  }

  const dataRecord = toJsonRecord(input.payload.data);
  const categoryId = readJsonString(dataRecord, "categoryId");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      to: input.expoPushToken,
      title: input.payload.title,
      body: input.payload.body,
      sound: "default",
      ...(categoryId ? { categoryId } : {}),
      data: {
        ...dataRecord,
        type: input.payload.type,
        organizationId: input.payload.organizationId,
        userId: input.payload.userId,
      },
    }),
  });
  const payload = await response.json().catch(() => null) as Json;

  if (!response.ok) {
    throw new Error(`Expo push request failed with status ${response.status}.`);
  }

  return {
    enabled: true,
    sent: 1,
    disabled: false,
    tickets: [payload],
  };
}

export async function sendNotificationToUser(
  supabase: SoreyaSupabaseClient,
  input: SendNotificationInput,
): Promise<ExpoNotificationResult> {
  if (!SAFE_NOTIFICATION_TYPES.includes(input.type)) {
    throw new Error("Unsupported notification type.");
  }

  if (!pushNotificationsEnabled()) {
    return disabledResult();
  }

  const tokens = await getNotificationTokensForUser(supabase, input.organizationId, input.userId);
  const preferences = await getNotificationPreferences(supabase, input.organizationId, input.userId).catch(() => null);
  const smartwatchPayload = shouldAttachSmartwatchPayload(input, preferences)
    ? input.smartwatchPayload
    : null;
  const data = {
    ...toJsonRecord(input.data ?? {}),
    ...(smartwatchPayload
      ? {
          smartwatch: smartwatchPayload,
          smartwatchSafetyCopy: SMARTWATCH_SAFETY_COPY,
          categoryId: categoryIdForSmartwatchPayload(smartwatchPayload, preferences),
        }
      : {}),
  };
  const payload: NotificationPayload = {
    type: input.type,
    title: input.title,
    body: input.body,
    data,
    organizationId: input.organizationId,
    userId: input.userId,
  };
  const results = await Promise.all(
    tokens.map((token) => sendExpoPushNotification({ expoPushToken: token.expoPushToken, payload })),
  );

  return {
    enabled: true,
    sent: results.reduce((total, result) => total + result.sent, 0),
    disabled: false,
    tickets: results.flatMap((result) => result.tickets),
  };
}

export function notifyPendingApprovalCreated(
  supabase: SoreyaSupabaseClient,
  input: Omit<SendNotificationInput, "type" | "title" | "body"> & { count: number },
) {
  return sendNotificationToUser(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    type: "pending_approval",
    title: "Soreya approvals waiting",
    body: `${input.count} suggested action${input.count === 1 ? "" : "s"} waiting for review.`,
    data: input.data ?? {},
    smartwatchPayload: input.smartwatchPayload,
  });
}

export function notifyDailySummaryReady(
  supabase: SoreyaSupabaseClient,
  input: Omit<SendNotificationInput, "type" | "title" | "body">,
) {
  return sendNotificationToUser(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    type: "daily_summary_ready",
    title: "Daily Summary ready",
    body: "Your Soreya Daily Summary is ready to review.",
    data: input.data ?? {},
    smartwatchPayload: input.smartwatchPayload,
  });
}

export function notifyEmergencyActionsCreated(
  supabase: SoreyaSupabaseClient,
  input: Omit<SendNotificationInput, "type" | "title" | "body"> & { count: number },
) {
  return sendNotificationToUser(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    type: "emergency_actions_created",
    title: "Emergency approvals prepared",
    body: `${input.count} emergency action${input.count === 1 ? "" : "s"} prepared for approval.`,
    data: input.data ?? {},
    smartwatchPayload: input.smartwatchPayload,
  });
}

export async function notifyWebsiteInboundMessage(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    channel: WebsiteInboundChannel;
    messageSnippet: string;
  },
): Promise<ExpoNotificationResult> {
  if (!pushNotificationsEnabled()) {
    return disabledResult();
  }

  const adminUserIds = await getOrganizationAdminUserIds(supabase, input.organizationId);
  const payload = buildWebsiteInboundNotificationPayload(input.channel, input.messageSnippet);
  const results = await Promise.all(
    adminUserIds.map((userId) =>
      sendNotificationToUser(supabase, {
        organizationId: input.organizationId,
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: {
          deepLink: SOREYA_DEEP_LINKS.approvals,
          source: input.channel === "form" ? "website_form" : "website_chat",
        },
      }).catch(() => disabledResult()),
    ),
  );

  return {
    enabled: true,
    sent: results.reduce((total, result) => total + result.sent, 0),
    disabled: false,
    tickets: results.flatMap((result) => result.tickets),
  };
}

export function safeNotificationType(value: unknown): NotificationType | null {
  return typeof value === "string" && SAFE_NOTIFICATION_TYPES.includes(value as NotificationType)
    ? value as NotificationType
    : null;
}

function disabledResult(): ExpoNotificationResult {
  return {
    enabled: false,
    sent: 0,
    disabled: true,
    tickets: [],
  };
}

function toJsonRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readJsonString(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function shouldAttachSmartwatchPayload(
  input: SendNotificationInput,
  preferences: Awaited<ReturnType<typeof getNotificationPreferences>>,
): boolean {
  if (!input.smartwatchPayload) {
    return false;
  }

  if (preferences?.watchFriendlyNotificationsEnabled === false) {
    return false;
  }

  if (input.type === "daily_summary_ready" && preferences?.showDailySummaryOnWatch === false) {
    return false;
  }

  if (input.type === "emergency_actions_created" && preferences?.emergencyShortcutsOnWatch === false) {
    return false;
  }

  return true;
}

function categoryIdForSmartwatchPayload(
  payload: SmartwatchNotificationPayload,
  preferences: Awaited<ReturnType<typeof getNotificationPreferences>>,
): string {
  if (
    payload.type === "pending_approval"
    && (preferences?.allowQuickApproveFromWatch || preferences?.allowQuickIgnoreFromWatch)
  ) {
    return "SOREYA_APPROVAL";
  }

  return "SOREYA_OPEN";
}

async function getOrganizationAdminUserIds(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"]);

  if (error) {
    throw error;
  }

  return [...new Set((data ?? []).map((row) => row.user_id))];
}
