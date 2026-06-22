import {
  approveSuggestedAction,
  createAuditLog,
  getNotificationPreferences,
  getSuggestedActionById,
  ignoreSuggestedAction,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type { Json, SmartwatchActionType } from "@soreya/shared";
import { z } from "zod";

import { jsonError } from "@/lib/server/daily-summary-api";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import {
  createServiceRoleServerSupabaseClient,
  getAuthenticatedServerContext,
} from "@/lib/server/supabase";
import {
  verifySignedActionToken,
  type SignedActionTokenPayload,
} from "@/lib/server/signed-action-token";
import { SMARTWATCH_SAFETY_COPY, SOREYA_DEEP_LINKS } from "@/lib/server/watch-notifications";

const smartwatchActionSchema = z.enum([
  "quick_approve",
  "quick_ignore",
  "open_mobile",
  "emergency_delay",
  "emergency_reschedule_today",
  "view_daily_summary",
]);

const notificationActionSchema = z.object({
  actionType: smartwatchActionSchema.optional(),
  smartwatchActionType: smartwatchActionSchema.optional(),
  actionIdentifier: z.enum(["APPROVE", "IGNORE", "OPEN"]).optional(),
  signedActionToken: z.string().min(1).optional(),
  suggestedActionId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  actionId: z.string().optional(),
  emergencyActionId: z.string().uuid().optional(),
  dailySummaryId: z.string().uuid().optional(),
  deepLink: z.string().optional(),
  smartwatch: z.unknown().optional(),
}).passthrough();

type ActionContext = {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  userId: string;
  authMode: "session" | "signed_token";
  signedPayload: SignedActionTokenPayload | null;
};

export async function POST(request: Request) {
  const rateLimit = await checkRateLimitAsync(request, { route: "/api/notifications/action", limit: 30 });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const rawBody = await request.json().catch(() => ({}));
    const body = notificationActionSchema.parse(rawBody);
    const actionType = body.actionType
      ?? body.smartwatchActionType
      ?? actionTypeFromIdentifier(body.actionIdentifier);
    const deepLink = safeDeepLink(body.deepLink ?? null, actionType ?? null);

    if (!actionType) {
      return blockedResponse("unsupported_action", "Unsupported smartwatch notification action.", deepLink);
    }

    const contextResult = await getActionContext(body, actionType);

    if (!contextResult.ok) {
      return blockedResponse(contextResult.reason, contextResult.message, deepLink);
    }

    const context = contextResult.context;

    if (actionType === "open_mobile" || actionType === "view_daily_summary") {
      await auditNotificationAction(context, "notification_action_opened", actionType, "opened", body);

      return Response.json({
        status: "handled",
        actionType,
        deepLink,
        safetyCopy: SMARTWATCH_SAFETY_COPY,
      });
    }

    if (actionType === "emergency_delay" || actionType === "emergency_reschedule_today") {
      await auditNotificationAction(context, "notification_action_blocked", actionType, "mobile_confirmation_required", body);

      return blockedResponse(
        "mobile_confirmation_required",
        "Emergency smartwatch actions can only prepare previews or pending approvals in the mobile app.",
        SOREYA_DEEP_LINKS.emergency,
      );
    }

    const preferences = await getNotificationPreferences(
      context.supabase,
      context.organizationId,
      context.userId,
    ).catch(() => null);

    if (actionType === "quick_approve" && preferences?.allowQuickApproveFromWatch !== true) {
      await auditNotificationAction(context, "notification_action_blocked", actionType, "blocked_preference", body);

      return blockedResponse(
        "quick_approve_disabled",
        "Quick approve from watch is disabled.",
        SOREYA_DEEP_LINKS.approvals,
      );
    }

    if (actionType === "quick_ignore" && preferences?.allowQuickIgnoreFromWatch !== true) {
      await auditNotificationAction(context, "notification_action_blocked", actionType, "blocked_preference", body);

      return blockedResponse(
        "quick_ignore_disabled",
        "Quick ignore from watch is disabled.",
        SOREYA_DEEP_LINKS.approvals,
      );
    }

    const suggestedActionId = body.suggestedActionId ?? context.signedPayload?.suggestedActionId ?? null;

    if (!suggestedActionId) {
      await auditNotificationAction(context, "notification_action_blocked", actionType, "blocked_missing_action", body);

      return blockedResponse(
        "missing_suggested_action",
        "Suggested action id is required.",
        SOREYA_DEEP_LINKS.approvals,
      );
    }

    const action = await getSuggestedActionById(context.supabase, context.organizationId, suggestedActionId);

    if (!action || action.status !== "pending_approval") {
      await auditNotificationAction(context, "notification_action_blocked", actionType, "blocked_non_pending", {
        ...body,
        currentStatus: action?.status ?? null,
      });

      return blockedResponse(
        "not_pending_approval",
        "Smartwatch actions can only change pending approvals.",
        SOREYA_DEEP_LINKS.approvals,
      );
    }

    if (actionType === "quick_approve") {
      const approvedAction = await approveSuggestedAction(context.supabase, {
        organizationId: context.organizationId,
        suggestedActionId,
        userId: context.userId,
        note: "Approved from smartwatch notification. Approval is not execution.",
      });
      await auditNotificationAction(context, "notification_action_approved", actionType, "handled", body);

      return Response.json({
        status: "handled",
        action: approvedAction,
        safetyCopy: SMARTWATCH_SAFETY_COPY,
      });
    }

    const ignoredAction = await ignoreSuggestedAction(context.supabase, {
      organizationId: context.organizationId,
      suggestedActionId,
      userId: context.userId,
      note: "Ignored from smartwatch notification.",
    });
    await auditNotificationAction(context, "notification_action_ignored", actionType, "handled", body);

    return Response.json({
      status: "handled",
      action: ignoredAction,
      safetyCopy: SMARTWATCH_SAFETY_COPY,
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}

async function getActionContext(
  body: z.infer<typeof notificationActionSchema>,
  actionType: SmartwatchActionType,
): Promise<
  | { ok: true; context: ActionContext }
  | { ok: false; reason: string; message: string }
> {
  const authenticatedContext = await getAuthenticatedServerContext().catch(() => null);

  if (authenticatedContext) {
    return {
      ok: true,
      context: {
        supabase: authenticatedContext.supabase,
        organizationId: authenticatedContext.userOrganization.organization.id,
        userId: authenticatedContext.user.id,
        authMode: "session",
        signedPayload: null,
      },
    };
  }

  const signedActionToken = readSignedActionTokenFromBody(body, actionType);
  const verification = verifySignedActionToken(signedActionToken);

  if (!verification.valid) {
    return {
      ok: false,
      reason: verification.reason === "expired" ? "token_expired" : "mobile_confirmation_required",
      message: verification.reason === "expired"
        ? "Signed action token expired."
        : "Authenticated session or signed action token required.",
    };
  }

  const supabase = safeCreateServiceRoleClient();

  if (!supabase) {
    return {
      ok: false,
      reason: "mobile_confirmation_required",
      message: "Server-side signed action handling is not configured.",
    };
  }

  const context: ActionContext = {
    supabase,
    organizationId: verification.payload.organizationId,
    userId: verification.payload.userId,
    authMode: "signed_token",
    signedPayload: verification.payload,
  };
  const mismatch = validateSignedPayloadAgainstBody(verification.payload, body, actionType);

  if (mismatch) {
    await auditNotificationAction(context, "notification_action_blocked", actionType, mismatch, body);

    return {
      ok: false,
      reason: mismatch,
      message: "Signed action token does not match the notification action payload.",
    };
  }

  return { ok: true, context };
}

function safeCreateServiceRoleClient(): SoreyaSupabaseClient | null {
  try {
    return createServiceRoleServerSupabaseClient();
  } catch {
    return null;
  }
}

function validateSignedPayloadAgainstBody(
  payload: SignedActionTokenPayload,
  body: z.infer<typeof notificationActionSchema>,
  actionType: SmartwatchActionType,
): string | null {
  if (payload.actionType !== actionType) {
    return "action_mismatch";
  }

  if (body.organizationId && body.organizationId !== payload.organizationId) {
    return "organization_mismatch";
  }

  if (body.userId && body.userId !== payload.userId) {
    return "user_mismatch";
  }

  if (body.suggestedActionId && payload.suggestedActionId && body.suggestedActionId !== payload.suggestedActionId) {
    return "suggested_action_mismatch";
  }

  if (body.deviceId && payload.deviceId && body.deviceId !== payload.deviceId) {
    return "device_mismatch";
  }

  return null;
}

async function auditNotificationAction(
  context: ActionContext,
  eventName: "notification_action_approved" | "notification_action_ignored" | "notification_action_blocked" | "notification_action_opened",
  actionType: SmartwatchActionType,
  result: string,
  body: Record<string, unknown>,
) {
  const suggestedActionId = readOptionalString(body.suggestedActionId)
    ?? context.signedPayload?.suggestedActionId
    ?? null;

  await createAuditLog(context.supabase, {
    organizationId: context.organizationId,
    userId: context.userId,
    eventName,
    entityTable: uuidOrNull(suggestedActionId) ? "suggested_actions" : null,
    entityId: uuidOrNull(suggestedActionId),
    metadata: {
      actionType,
      result,
      actionId: readOptionalString(body.actionId),
      suggestedActionId,
      emergencyActionId: readOptionalString(body.emergencyActionId),
      dailySummaryId: readOptionalString(body.dailySummaryId),
      authMode: context.authMode,
      deviceId: readOptionalString(body.deviceId) ?? context.signedPayload?.deviceId ?? null,
      source: "notification_action",
      safetyCopy: SMARTWATCH_SAFETY_COPY,
    },
  });
}

function readSignedActionTokenFromBody(
  body: z.infer<typeof notificationActionSchema>,
  actionType: SmartwatchActionType,
): string | null {
  const smartwatch = toRecord(body.smartwatch);
  const signedActionTokens = toRecord(smartwatch.signedActionTokens);
  const actionScopedToken = signedActionTokens[actionType];

  return body.signedActionToken
    ?? (typeof actionScopedToken === "string" ? actionScopedToken : null)
    ?? (typeof smartwatch.signedActionToken === "string" ? smartwatch.signedActionToken : null);
}

function actionTypeFromIdentifier(identifier: "APPROVE" | "IGNORE" | "OPEN" | undefined): SmartwatchActionType | undefined {
  if (identifier === "APPROVE") {
    return "quick_approve";
  }

  if (identifier === "IGNORE") {
    return "quick_ignore";
  }

  if (identifier === "OPEN") {
    return "open_mobile";
  }

  return undefined;
}

function blockedResponse(reason: string, message: string, deepLink: string) {
  return Response.json({
    status: "blocked",
    reason,
    message,
    deepLink,
    safetyCopy: SMARTWATCH_SAFETY_COPY,
  });
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function safeDeepLink(value: string | null, actionType: SmartwatchActionType | null): string {
  const allowed = new Set<string>(Object.values(SOREYA_DEEP_LINKS));

  if (value && allowed.has(value)) {
    return value;
  }

  if (actionType === "view_daily_summary") {
    return SOREYA_DEEP_LINKS.dailySummary;
  }

  if (actionType === "emergency_delay" || actionType === "emergency_reschedule_today") {
    return SOREYA_DEEP_LINKS.emergency;
  }

  return SOREYA_DEEP_LINKS.approvals;
}

function toRecord(value: unknown): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : {};
}

function uuidOrNull(value: string | null): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}
