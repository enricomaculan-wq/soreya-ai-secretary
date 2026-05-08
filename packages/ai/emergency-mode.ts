import type {
  Contact,
  EmergencyModeRequest,
  EmergencyModeResult,
  EmergencySuggestedActionDraft,
  IncomingMessage,
  Json,
  NormalizedCalendarEvent,
  RescheduleProposal,
  SuggestedActionType,
  UserRule,
} from "@soreya/shared";

import { suggestAlternativeSlots } from "./calendar";

export type EmergencyPlanInput = {
  organizationId: string;
  request: EmergencyModeRequest;
  events: NormalizedCalendarEvent[];
  contacts?: Contact[];
  recentMessages?: IncomingMessage[];
  userRules?: UserRule[];
};

const MAX_ALTERNATIVE_SLOTS = 3;

export function buildEmergencyPlan(input: EmergencyPlanInput): EmergencyModeResult {
  const affectedEvents = selectAffectedEvents(input.events, input.request);
  const warnings: string[] = [];
  const proposals = affectedEvents.map((event) => {
    const contact = matchContact(event, input.contacts ?? []);
    const preferredChannel = inferPreferredChannel(event, contact, input.recentMessages ?? []);
    const recipient = inferRecipient(event, contact);
    const alternatives = suggestRescheduleSlots(input.events, input.userRules ?? [], event);
    const firstAlternative = alternatives[0] ?? null;
    const messageBody = input.request.type === "notify_delay"
      ? buildDelayMessage(input.request, event, contact)
      : buildEmergencyMessage(input.request, event, contact);

    if (!recipient.email && !recipient.phone) {
      warnings.push(`Manual review needed for ${event.title}: no email or phone found.`);
    }

    return {
      id: `proposal-${event.id}`,
      organizationId: input.organizationId,
      emergencyActionId: "",
      rescheduleBatchId: null,
      calendarEventId: event.id,
      contactId: contact?.id ?? null,
      originalStartsAt: event.startsAt,
      originalEndsAt: event.endsAt,
      proposedStartsAt: firstAlternative?.startsAt ?? null,
      proposedEndsAt: firstAlternative?.endsAt ?? null,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      preferredChannel: recipient.email || recipient.phone ? preferredChannel : "manual_review",
      messageBody,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies RescheduleProposal;
  });
  const suggestedActions = buildSuggestedActionDrafts(input.request, proposals, warnings);

  return {
    emergencyAction: null,
    affectedEvents,
    proposals,
    suggestedActions,
    warnings: [...warnings, ...buildEmergencyRecommendations({ affectedEvents, proposals, suggestedActions, warnings })],
  };
}

export function selectAffectedEvents(
  events: NormalizedCalendarEvent[],
  request: EmergencyModeRequest,
): NormalizedCalendarEvent[] {
  const targetDate = request.targetDate;
  const activeEvents = events
    .filter((event) => event.status !== "cancelled")
    .filter((event) => event.startsAt.slice(0, 10) === targetDate)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  if (request.type === "reschedule_morning" || request.targetWindow === "morning") {
    return activeEvents.filter((event) => new Date(event.startsAt).getHours() < 13);
  }

  if (request.type === "reschedule_afternoon" || request.targetWindow === "afternoon") {
    return activeEvents.filter((event) => new Date(event.startsAt).getHours() >= 13);
  }

  if (request.type === "notify_delay") {
    const delayMinutes = request.delayMinutes ?? 0;
    const now = Date.now();
    return activeEvents.filter((event) => new Date(event.startsAt).getTime() >= now - minutes(delayMinutes));
  }

  if (request.type === "block_today") {
    return [];
  }

  return activeEvents;
}

export function buildEmergencyMessage(
  request: EmergencyModeRequest,
  event: NormalizedCalendarEvent,
  contact?: Contact | null,
): string {
  if (request.customMessage?.trim()) {
    return request.customMessage.trim();
  }

  const greeting = contact?.display_name ? `Hi ${contact.display_name},` : "Hi,";
  const eventTime = formatDateTime(event.startsAt);
  const reason = request.reason || "an unexpected issue";

  if (request.type === "notify_all_today") {
    return toneMessage(request, `${greeting}\n\nI wanted to let you know that today's appointment at ${eventTime} may be affected by ${reason}. I will confirm next steps as soon as possible.\n\nThank you for your understanding.`);
  }

  return toneMessage(request, `${greeting}\n\nI am sorry, but I need to reschedule today's appointment at ${eventTime} because of ${reason}. Please confirm if one of the proposed alternatives works for you.\n\nThank you for your understanding.`);
}

export function buildDelayMessage(
  request: EmergencyModeRequest,
  event: NormalizedCalendarEvent,
  contact?: Contact | null,
): string {
  if (request.customMessage?.trim()) {
    return request.customMessage.trim();
  }

  const greeting = contact?.display_name ? `Hi ${contact.display_name},` : "Hi,";
  const delay = request.delayMinutes ?? 15;
  const eventTime = formatDateTime(event.startsAt);

  return toneMessage(request, `${greeting}\n\nI am running about ${delay} minutes late for our appointment at ${eventTime}. I will keep you posted and appreciate your patience.`);
}

export function suggestRescheduleSlots(
  events: NormalizedCalendarEvent[],
  userRules: UserRule[],
  originalEvent: NormalizedCalendarEvent,
) {
  void userRules;
  return suggestAlternativeSlots(events, {}, originalEvent.startsAt, originalEvent.endsAt).slice(0, MAX_ALTERNATIVE_SLOTS);
}

export function inferPreferredChannel(
  event: NormalizedCalendarEvent,
  contact?: Contact | null,
  recentMessages: IncomingMessage[] = [],
): "email" | "whatsapp" | "manual_review" {
  if (contact?.whatsapp_id || contact?.phone) {
    return "whatsapp";
  }

  if (contact?.email || event.attendees.some((attendee) => attendee.email)) {
    return "email";
  }

  const recent = recentMessages.find((message) =>
    event.attendees.some((attendee) => attendee.email && attendee.email === message.from_email),
  );

  if (recent?.whatsapp_phone) {
    return "whatsapp";
  }

  if (recent?.from_email) {
    return "email";
  }

  return "manual_review";
}

export function buildEmergencyRecommendations(result: Pick<EmergencyModeResult, "affectedEvents" | "proposals" | "suggestedActions" | "warnings">): string[] {
  const recommendations: string[] = [];

  if (result.affectedEvents.length === 0) {
    recommendations.push("No cached calendar events match this emergency target.");
  }

  if (result.warnings.length > 0) {
    recommendations.push("Review manual warnings before approving any customer-facing message.");
  }

  if (result.suggestedActions.length > 0) {
    recommendations.push("Open Actions to approve after creating this emergency plan.");
  }

  return recommendations;
}

function buildSuggestedActionDrafts(
  request: EmergencyModeRequest,
  proposals: RescheduleProposal[],
  warnings: string[],
): EmergencySuggestedActionDraft[] {
  if (request.type === "block_today") {
    return [
      {
        actionType: "block_calendar_day",
        title: "Block calendar day",
        rationale: "Emergency block proposal awaiting explicit approval.",
        draftPayload: {
          provider: "calendar",
          targetDate: request.targetDate,
          reason: request.reason,
          warning: "No calendar block will be created until final execution is enabled and approved.",
        },
        riskLevel: "high",
      },
    ];
  }

  return proposals.flatMap((proposal) => {
    const drafts: EmergencySuggestedActionDraft[] = [];
    const messageActionType = resolveMessageActionType(request, proposal.preferredChannel);

    if (messageActionType) {
      drafts.push({
        actionType: messageActionType,
        title: buildActionTitle(messageActionType, proposal),
        rationale: "Emergency message proposal awaiting explicit approval.",
        draftPayload: {
          provider: proposal.preferredChannel,
          recipientEmail: proposal.recipientEmail,
          recipientPhone: proposal.recipientPhone,
          recipientName: proposal.recipientName,
          body: proposal.messageBody,
          calendarEventId: proposal.calendarEventId,
          originalStartsAt: proposal.originalStartsAt,
          originalEndsAt: proposal.originalEndsAt,
          proposedStartsAt: proposal.proposedStartsAt,
          proposedEndsAt: proposal.proposedEndsAt,
          reason: request.reason,
        },
        riskLevel: warnings.length ? "high" : "normal",
        relatedProposalId: proposal.id,
      });
    } else {
      drafts.push({
        actionType: "manual_review",
        title: `Manual review: ${proposal.recipientName ?? "Unknown recipient"}`,
        rationale: "No reliable email or WhatsApp recipient was found.",
        draftPayload: proposal as unknown as Json,
        riskLevel: "high",
        relatedProposalId: proposal.id,
      });
    }

    if (["reschedule_all_today", "reschedule_morning", "reschedule_afternoon"].includes(request.type)) {
      drafts.push({
        actionType: "propose_calendar_reschedule",
        title: `Calendar reschedule proposal: ${proposal.recipientName ?? "event"}`,
        rationale: "Calendar reschedule proposal awaiting explicit approval.",
        draftPayload: {
          provider: "calendar",
          calendarEventId: proposal.calendarEventId,
          originalStartsAt: proposal.originalStartsAt,
          originalEndsAt: proposal.originalEndsAt,
          proposedStartsAt: proposal.proposedStartsAt,
          proposedEndsAt: proposal.proposedEndsAt,
          reason: request.reason,
        },
        riskLevel: "high",
        relatedProposalId: proposal.id,
      });
    }

    return drafts;
  });
}

function resolveMessageActionType(
  request: EmergencyModeRequest,
  channel: RescheduleProposal["preferredChannel"],
): SuggestedActionType | null {
  if (channel === "manual_review") {
    return null;
  }

  if (request.type === "notify_delay") {
    return channel === "whatsapp" ? "notify_delay_whatsapp" : "notify_delay_email";
  }

  if (channel === "whatsapp") {
    return "send_emergency_whatsapp";
  }

  return "send_emergency_email";
}

function buildActionTitle(actionType: SuggestedActionType, proposal: RescheduleProposal): string {
  const recipient = proposal.recipientName ?? proposal.recipientEmail ?? proposal.recipientPhone ?? "recipient";

  if (actionType.includes("delay")) {
    return `Notify delay: ${recipient}`;
  }

  return `Emergency message: ${recipient}`;
}

function matchContact(event: NormalizedCalendarEvent, contacts: Contact[]): Contact | null {
  const attendeeEmail = event.attendees.find((attendee) => attendee.email)?.email;

  if (!attendeeEmail) {
    return null;
  }

  return contacts.find((contact) => contact.email === attendeeEmail) ?? null;
}

function inferRecipient(event: NormalizedCalendarEvent, contact?: Contact | null) {
  const attendee = event.attendees.find((candidate) => candidate.email);

  return {
    name: contact?.display_name ?? attendee?.displayName ?? null,
    email: contact?.email ?? attendee?.email ?? null,
    phone: contact?.phone ?? contact?.whatsapp_id ?? null,
  };
}

function toneMessage(request: EmergencyModeRequest, base: string): string {
  const tone = request.messageTone ?? "professional";

  if (tone === "short") {
    return base.split("\n\n").slice(0, 2).join("\n\n");
  }

  if (tone === "friendly") {
    return `${base}\n\nThanks so much.`;
  }

  if (tone === "apologetic") {
    return `${base}\n\nI apologize for the inconvenience.`;
  }

  return base;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function minutes(value: number): number {
  return value * 60 * 1000;
}
