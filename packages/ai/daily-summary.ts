import type {
  AppointmentRequest,
  DailySummary,
  DailySummaryItem,
  IncomingMessage,
  NormalizedCalendarEvent,
  SuggestedAction,
  UserRule,
} from "@soreya/shared";

import { findAvailableSlots } from "./calendar";

export type DailySummaryBuildInput = {
  organizationId: string;
  summaryDate: string;
  timezone: string;
  events: NormalizedCalendarEvent[];
  appointmentRequests: AppointmentRequest[];
  pendingApprovals: SuggestedAction[];
  unhandledMessages: IncomingMessage[];
  userRules?: UserRule[];
  includeCalendar?: boolean;
  includePendingApprovals?: boolean;
  includeUnhandledMessages?: boolean;
  includeFreeSlots?: boolean;
};

export type DailySummaryDraft = Omit<DailySummary, "id" | "createdAt" | "updatedAt" | "viewedAt"> & {
  viewedAt?: string | null;
};

const MAX_ITEMS = 8;
const MAX_RECOMMENDATIONS = 5;

export function buildDailySummary(input: DailySummaryBuildInput): DailySummaryDraft {
  const events = input.includeCalendar === false ? [] : input.events;
  const pendingApprovals = input.includePendingApprovals === false ? [] : input.pendingApprovals;
  const unhandledMessages = input.includeUnhandledMessages === false ? [] : input.unhandledMessages;
  const conflicts = detectDailyConflicts(events);
  const freeSlots = input.includeFreeSlots === false ? [] : buildFreeSlots(events, input);
  const appointmentItems = summarizeTodayAppointments(events);
  const approvalItems = summarizePendingApprovals(pendingApprovals);
  const messageItems = summarizeUnhandledMessages(unhandledMessages);
  const conflictItems = conflicts.map((conflict, index) => ({
    id: `conflict-${index}-${conflict.primary.id}`,
    type: "conflict" as const,
    title: "Calendar conflict",
    description: `${conflict.primary.title} overlaps ${conflict.conflictingWith.title}.`,
    startsAt: conflict.startsAt,
    endsAt: conflict.endsAt,
    priority: "high" as const,
    relatedEntityType: "calendar_events_cache",
    relatedEntityId: conflict.primary.id,
    actionLabel: "Open calendar",
  }));
  const freeSlotItems = freeSlots.slice(0, 2).map((slot, index) => ({
    id: `free-slot-${index}-${slot.startsAt}`,
    type: "free_slot" as const,
    title: "Free working slot",
    description: `${slot.durationMinutes} minutes available.`,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    priority: "low" as const,
    relatedEntityType: null,
    relatedEntityId: null,
    actionLabel: "Open calendar",
  }));
  const recommendations = buildDailyRecommendations({
    ...input,
    events,
    pendingApprovals,
    unhandledMessages,
    conflictsCount: conflicts.length,
    freeSlotsCount: freeSlots.length,
  });
  const sortedAppointments = [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const items = [
    ...conflictItems,
    ...approvalItems,
    ...messageItems,
    ...appointmentItems,
    ...freeSlotItems,
  ].slice(0, MAX_ITEMS);

  return {
    organizationId: input.organizationId,
    summaryDate: input.summaryDate,
    timezone: input.timezone,
    status: "generated",
    title: `Daily Summary ${input.summaryDate}`,
    headline: buildHeadline(events, pendingApprovals, unhandledMessages, conflicts.length),
    totalAppointments: events.length,
    firstAppointmentAt: sortedAppointments[0]?.startsAt ?? null,
    lastAppointmentAt: sortedAppointments.at(-1)?.endsAt ?? null,
    pendingApprovalsCount: pendingApprovals.length,
    conflictsCount: conflicts.length,
    unhandledMessagesCount: unhandledMessages.length,
    freeSlotsCount: freeSlots.length,
    items,
    recommendations,
    generatedAt: new Date().toISOString(),
    viewedAt: null,
  };
}

export function detectDailyConflicts(events: NormalizedCalendarEvent[]): Array<{
  primary: NormalizedCalendarEvent;
  conflictingWith: NormalizedCalendarEvent;
  startsAt: string;
  endsAt: string;
}> {
  const activeEvents = events
    .filter((event) => event.status !== "cancelled")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const conflicts: Array<{
    primary: NormalizedCalendarEvent;
    conflictingWith: NormalizedCalendarEvent;
    startsAt: string;
    endsAt: string;
  }> = [];

  for (let index = 0; index < activeEvents.length; index += 1) {
    const event = activeEvents[index];

    for (const next of activeEvents.slice(index + 1)) {
      if (new Date(next.startsAt).getTime() >= new Date(event.endsAt).getTime()) {
        break;
      }

      conflicts.push({
        primary: event,
        conflictingWith: next,
        startsAt: maxDate(event.startsAt, next.startsAt),
        endsAt: minDate(event.endsAt, next.endsAt),
      });
    }
  }

  return conflicts;
}

export function summarizeTodayAppointments(events: NormalizedCalendarEvent[]): DailySummaryItem[] {
  return [...events]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 4)
    .map((event) => ({
      id: `appointment-${event.id}`,
      type: "appointment",
      title: event.title,
      description: event.location ?? event.description ?? "Calendar appointment",
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      priority: "normal",
      relatedEntityType: "calendar_events_cache",
      relatedEntityId: event.id,
      actionLabel: "Open calendar",
    }));
}

export function summarizePendingApprovals(actions: SuggestedAction[]): DailySummaryItem[] {
  return actions.slice(0, 3).map((action) => ({
    id: `approval-${action.id}`,
    type: "pending_approval",
    title: action.title,
    description: `${action.action_type} is waiting for review.`,
    startsAt: null,
    endsAt: null,
    priority: action.risk_level === "high" || action.risk_level === "critical" ? "high" : "normal",
    relatedEntityType: "suggested_actions",
    relatedEntityId: action.id,
    actionLabel: "Go to approvals",
  }));
}

export function summarizeUnhandledMessages(messages: IncomingMessage[]): DailySummaryItem[] {
  return messages.slice(0, 3).map((message) => ({
    id: `message-${message.id}`,
    type: "unhandled_message",
    title: message.subject ?? message.from_name ?? message.from_email ?? message.whatsapp_phone ?? "Unhandled message",
    description: message.snippet ?? message.body_text ?? "Message needs review.",
    startsAt: message.received_at,
    endsAt: null,
    priority: "normal",
    relatedEntityType: "incoming_messages",
    relatedEntityId: message.id,
    actionLabel: "Open inbox",
  }));
}

export function buildDailyRecommendations(
  input: DailySummaryBuildInput & {
    conflictsCount?: number;
    freeSlotsCount?: number;
  },
): DailySummaryItem[] {
  const recommendations: DailySummaryItem[] = [];
  const firstAppointment = [...input.events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  )[0];

  if ((input.conflictsCount ?? detectDailyConflicts(input.events).length) > 0) {
    recommendations.push(recommendationItem("Resolve calendar conflicts", "Review overlapping events before sending availability replies.", "Open calendar", "high"));
    recommendations.push(recommendationItem("Use Emergency Mode if your day changes", "Conflicts can be turned into prepared reschedule messages and calendar proposals.", "Emergency mode", "high"));
  }

  if (input.pendingApprovals.length > 0) {
    recommendations.push(
      recommendationItem(
        "Review pending approvals",
        firstAppointment
          ? `Clear approvals before ${formatTime(firstAppointment.startsAt)} if possible.`
          : "Clear approvals before replying to customers.",
        "Go to approvals",
        "high",
      ),
    );
  }

  if (input.unhandledMessages.length > 0) {
    recommendations.push(recommendationItem("Triage unhandled messages", "Some incoming messages still need review.", "Open inbox", "normal"));
  }

  if ((input.freeSlotsCount ?? 0) > 0) {
    recommendations.push(recommendationItem("Use free working slots", "There are open windows that can absorb follow-ups or calls.", "Open calendar", "low"));
  }

  if (input.userRules?.length) {
    recommendations.push(recommendationItem("Apply active user rules", `${input.userRules.length} active rule(s) may affect replies today.`, "Open settings", "normal"));
  }

  if (input.events.length >= 5 && recommendations.every((item) => item.title !== "Use Emergency Mode if your day changes")) {
    recommendations.push(recommendationItem("Use Emergency Mode if your day changes", "You have a busy day; Soreya can prepare delay or reschedule approvals quickly.", "Emergency mode", "normal"));
  }

  return recommendations.slice(0, MAX_RECOMMENDATIONS);
}

function buildHeadline(
  events: NormalizedCalendarEvent[],
  pendingApprovals: SuggestedAction[],
  unhandledMessages: IncomingMessage[],
  conflictsCount: number,
): string {
  if (events.length === 0) {
    return "Giornata libera o non sincronizzata";
  }

  if (conflictsCount > 0) {
    return `${events.length} appuntamenti con ${conflictsCount} conflitto/i da risolvere`;
  }

  if (pendingApprovals.length > 0) {
    return `${events.length} appuntamenti e ${pendingApprovals.length} approval da rivedere`;
  }

  if (unhandledMessages.length > 0) {
    return `${events.length} appuntamenti e ${unhandledMessages.length} messaggi da gestire`;
  }

  return `${events.length} appuntamenti in agenda oggi`;
}

function buildFreeSlots(events: NormalizedCalendarEvent[], input: DailySummaryBuildInput) {
  const rangeStart = new Date(`${input.summaryDate}T00:00:00.000`).toISOString();
  const rangeEndDate = new Date(rangeStart);
  rangeEndDate.setDate(rangeEndDate.getDate() + 1);

  return findAvailableSlots(
    events,
    {
      timezone: input.timezone,
      durationMinutes: 45,
      bufferMinutes: 10,
    },
    rangeStart,
    rangeEndDate.toISOString(),
  ).filter((slot) => slot.durationMinutes >= 45);
}

function recommendationItem(
  title: string,
  description: string,
  actionLabel: string,
  priority: DailySummaryItem["priority"],
): DailySummaryItem {
  return {
    id: `recommendation-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    type: "recommendation",
    title,
    description,
    startsAt: null,
    endsAt: null,
    priority,
    relatedEntityType: null,
    relatedEntityId: null,
    actionLabel,
  };
}

function maxDate(first: string, second: string): string {
  return new Date(Math.max(new Date(first).getTime(), new Date(second).getTime())).toISOString();
}

function minDate(first: string, second: string): string {
  return new Date(Math.min(new Date(first).getTime(), new Date(second).getTime())).toISOString();
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("it", {
    timeStyle: "short",
  }).format(new Date(value));
}
