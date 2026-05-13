import { buildEmergencyPlan } from "@soreya/ai";
import {
  createEmergencyAction,
  createEmergencySuggestedActions,
  createRescheduleBatch,
  createRescheduleProposals,
  getEventsForEmergencyTarget,
  updateEmergencyActionStatus,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type {
  Contact,
  EmergencyMessageTone,
  EmergencyModeRequest,
  EmergencyModeResult,
  EmergencySuggestedActionDraft,
  EmergencyTargetWindow,
  IncomingMessage,
  RescheduleProposal,
  UserRule,
} from "@soreya/shared";
import { NextResponse } from "next/server";

type EmergencyPlanPreview = Omit<EmergencyModeResult, "suggestedActions"> & {
  suggestedActions: EmergencySuggestedActionDraft[];
};

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}

export function normalizeEmergencyRequest(body: Record<string, unknown>): EmergencyModeRequest {
  const type = readString(body.type, "type") as EmergencyModeRequest["type"];
  const targetDate = readString(body.targetDate, "targetDate");
  const reason = readString(body.reason, "reason");
  const delayMinutes = typeof body.delayMinutes === "number" ? body.delayMinutes : Number(body.delayMinutes ?? 0) || null;
  const messageTone = (typeof body.messageTone === "string" ? body.messageTone : "professional") as EmergencyMessageTone;
  const targetWindow = (typeof body.targetWindow === "string" ? body.targetWindow : "all_day") as EmergencyTargetWindow;
  const customMessage = typeof body.customMessage === "string" && body.customMessage.trim() ? body.customMessage.trim() : null;

  return {
    type,
    targetDate,
    reason,
    delayMinutes,
    messageTone,
    targetWindow,
    customMessage,
  };
}

export async function buildEmergencyPreview(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
  request: EmergencyModeRequest,
): Promise<EmergencyPlanPreview> {
  const [events, contacts, recentMessages, userRules] = await Promise.all([
    getEventsForEmergencyTarget(supabase, organizationId, request.targetDate, request.targetWindow ?? "all_day"),
    getContacts(supabase, organizationId),
    getRecentMessages(supabase, organizationId),
    getActiveUserRules(supabase, organizationId),
  ]);

  return buildEmergencyPlan({
    organizationId,
    request,
    events,
    contacts,
    recentMessages,
    userRules,
  }) as EmergencyPlanPreview;
}

export async function persistEmergencyPlan(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    request: EmergencyModeRequest;
  },
) {
  const preview = await buildEmergencyPreview(supabase, input.organizationId, input.request);
  const emergencyAction = await createEmergencyAction(supabase, {
    organizationId: input.organizationId,
    createdBy: input.userId,
    type: input.request.type,
    status: "draft",
    reason: input.request.reason,
    targetDate: input.request.targetDate,
    delayMinutes: input.request.delayMinutes ?? null,
    messageTone: input.request.messageTone ?? "professional",
    affectedEventsCount: preview.affectedEvents.length,
    suggestedActionsCount: preview.suggestedActions.length,
    metadata: {
      request: input.request,
      warnings: preview.warnings,
    },
  });
  const needsBatch = ["reschedule_all_today", "reschedule_morning", "reschedule_afternoon"].includes(input.request.type);
  const batch = needsBatch
    ? await createRescheduleBatch(supabase, {
        organizationId: input.organizationId,
        emergencyActionId: emergencyAction.id,
        targetDate: input.request.targetDate,
        affectedEventsCount: preview.affectedEvents.length,
      })
    : null;
  const proposals = await createRescheduleProposals(
    supabase,
    preview.proposals.map((proposal) => ({
      organizationId: input.organizationId,
      emergencyActionId: emergencyAction.id,
      rescheduleBatchId: batch?.id ?? null,
      calendarEventId: proposal.calendarEventId,
      contactId: proposal.contactId,
      originalStartsAt: proposal.originalStartsAt,
      originalEndsAt: proposal.originalEndsAt,
      proposedStartsAt: proposal.proposedStartsAt,
      proposedEndsAt: proposal.proposedEndsAt,
      recipientName: proposal.recipientName,
      recipientEmail: proposal.recipientEmail,
      recipientPhone: proposal.recipientPhone,
      preferredChannel: proposal.preferredChannel,
      messageBody: proposal.messageBody,
      status: "draft",
    })),
  );
  const proposalByEvent = new Map(proposals.map((proposal) => [proposal.calendarEventId, proposal]));
  const suggestedActions = await createEmergencySuggestedActions(
    supabase,
    preview.suggestedActions.map((draft) => ({
      ...draft,
      organizationId: input.organizationId,
      emergencyActionId: emergencyAction.id,
      rescheduleProposalId: findProposalIdForDraft(draft.draftPayload, proposalByEvent),
    })),
  );
  const { error: countError } = await supabase
    .from("emergency_actions")
    .update({ suggested_actions_count: suggestedActions.length })
    .eq("organization_id", input.organizationId)
    .eq("id", emergencyAction.id);

  if (countError) {
    throw countError;
  }

  const updatedEmergencyAction = await updateEmergencyActionStatus(
    supabase,
    input.organizationId,
    emergencyAction.id,
    "pending_approval",
  );

  return {
    emergencyAction: {
      ...updatedEmergencyAction,
      suggestedActionsCount: suggestedActions.length,
    },
    affectedEvents: preview.affectedEvents,
    proposals,
    suggestedActions,
    warnings: preview.warnings,
  };
}

async function getContacts(supabase: SoreyaSupabaseClient, organizationId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .limit(500);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getRecentMessages(supabase: SoreyaSupabaseClient, organizationId: string): Promise<IncomingMessage[]> {
  const { data, error } = await supabase
    .from("incoming_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getActiveUserRules(supabase: SoreyaSupabaseClient, organizationId: string): Promise<UserRule[]> {
  const { data, error } = await supabase
    .from("user_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function findProposalIdForDraft(
  payload: unknown,
  proposalByEvent: Map<string, RescheduleProposal>,
): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const calendarEventId = (payload as Record<string, unknown>).calendarEventId;
  return typeof calendarEventId === "string" ? proposalByEvent.get(calendarEventId)?.id ?? null : null;
}

function readString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}
