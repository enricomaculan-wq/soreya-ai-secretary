import {
  SOREYA_DEEP_LINKS,
  type DailySummary,
  type EmergencyAction,
  type QuickCallNote,
  type SmartwatchNotificationPayload,
  type SuggestedAction,
} from "@soreya/shared";

import { createSignedActionToken } from "@/lib/server/signed-action-token";

export { SOREYA_DEEP_LINKS };

export const SMARTWATCH_SAFETY_LABEL = "Draft only";
export const SMARTWATCH_SAFETY_COPY =
  "Smartwatch approval is not execution. Soreya still requires final confirmation before sending messages or modifying calendars.";

type SignedWatchActionContext = {
  organizationId: string;
  userId: string;
  deviceId?: string | null;
};

export function buildSmartwatchPendingApprovalNotification(
  action: Pick<SuggestedAction, "id" | "title" | "action_type" | "risk_level">,
  context?: SignedWatchActionContext,
): SmartwatchNotificationPayload {
  const approveToken = createWatchActionToken(context, {
    actionType: "quick_approve",
    suggestedActionId: action.id,
  });
  const ignoreToken = createWatchActionToken(context, {
    actionType: "quick_ignore",
    suggestedActionId: action.id,
  });

  return {
    type: "pending_approval",
    title: "Approval waiting",
    shortBody: truncateForWatch(action.title || titleFromActionType(action.action_type), 72),
    actionId: `watch-approval:${action.id}`,
    suggestedActionId: action.id,
    emergencyActionId: null,
    dailySummaryId: null,
    deepLink: SOREYA_DEEP_LINKS.approvals,
    signedActionToken: approveToken,
    signedActionTokens: {
      ...(approveToken ? { quick_approve: approveToken } : {}),
      ...(ignoreToken ? { quick_ignore: ignoreToken } : {}),
    },
    requiresMobileForEdit: true,
    safetyLabel: SMARTWATCH_SAFETY_LABEL,
  };
}

export function buildSmartwatchDailySummaryNotification(
  summary: Pick<DailySummary, "id" | "headline" | "pendingApprovalsCount" | "totalAppointments">,
): SmartwatchNotificationPayload {
  const countSummary = `${summary.totalAppointments} appt / ${summary.pendingApprovalsCount} approvals`;

  return {
    type: "daily_summary_ready",
    title: "Daily Summary",
    shortBody: truncateForWatch(summary.headline || countSummary, 72),
    actionId: `watch-daily-summary:${summary.id}`,
    suggestedActionId: null,
    emergencyActionId: null,
    dailySummaryId: summary.id,
    deepLink: SOREYA_DEEP_LINKS.dailySummary,
    signedActionToken: null,
    requiresMobileForEdit: true,
    safetyLabel: SMARTWATCH_SAFETY_LABEL,
  };
}

export function buildSmartwatchEmergencyNotification(
  emergencyAction: Pick<EmergencyAction, "id" | "type" | "reason" | "suggestedActionsCount">,
): SmartwatchNotificationPayload {
  return {
    type: "emergency_actions_created",
    title: "Emergency drafts",
    shortBody: truncateForWatch(
      `${emergencyTitle(emergencyAction.type)} / ${emergencyAction.suggestedActionsCount} approvals`,
      72,
    ),
    actionId: `watch-emergency:${emergencyAction.id}`,
    suggestedActionId: null,
    emergencyActionId: emergencyAction.id,
    dailySummaryId: null,
    deepLink: SOREYA_DEEP_LINKS.emergency,
    signedActionToken: null,
    requiresMobileForEdit: true,
    safetyLabel: SMARTWATCH_SAFETY_LABEL,
  };
}

export function buildSmartwatchQuickCallNotification(
  callNote: Pick<QuickCallNote, "id" | "intentType" | "customerName" | "reason">,
): SmartwatchNotificationPayload {
  return {
    type: "quick_call_created",
    title: "Quick Call ready",
    shortBody: truncateForWatch(callNote.customerName ?? callNote.reason ?? titleFromQuickCallIntent(callNote.intentType), 72),
    actionId: `watch-quick-call:${callNote.id}`,
    suggestedActionId: null,
    emergencyActionId: null,
    dailySummaryId: null,
    deepLink: SOREYA_DEEP_LINKS.quickCall,
    signedActionToken: null,
    requiresMobileForEdit: true,
    safetyLabel: SMARTWATCH_SAFETY_LABEL,
  };
}

function createWatchActionToken(
  context: SignedWatchActionContext | undefined,
  input: { actionType: "quick_approve" | "quick_ignore"; suggestedActionId: string },
): string | null {
  if (!context) {
    return null;
  }

  try {
    return createSignedActionToken({
      organizationId: context.organizationId,
      userId: context.userId,
      suggestedActionId: input.suggestedActionId,
      actionType: input.actionType,
      deviceId: context.deviceId ?? null,
    });
  } catch {
    return null;
  }
}

function truncateForWatch(value: string, maxLength: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function titleFromActionType(actionType: SuggestedAction["action_type"]): string {
  return actionType.replace(/_/g, " ");
}

function titleFromQuickCallIntent(intentType: QuickCallNote["intentType"]): string {
  return intentType.replace(/_/g, " ");
}

function emergencyTitle(type: EmergencyAction["type"]): string {
  return type.replace(/_/g, " ");
}
