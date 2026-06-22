import type {
  AvailabilitySlot,
  Json,
  NormalizedCalendarEvent,
  OrganizationBrainContext,
  QuickCallAnalysis,
  QuickCallIntentType,
  QuickCallNote,
  QuickCallSuggestedActionDraft,
  UserRule,
} from "@soreya/shared";

import { readRequiredDurationMinutesFromConstraints } from "@soreya/shared";

import { filterAlternativesForBrainConstraints } from "./brain";
import { findAvailableSlots, suggestAlternativeSlots } from "./calendar";
import { analyzeQuickCallWithAI as analyzeQuickCallWithOpenAI } from "./appointment-ai";

export type QuickCallContext = {
  timezone?: string;
  events?: NormalizedCalendarEvent[];
  userRules?: UserRule[];
  brainContext?: OrganizationBrainContext;
  fallbackAnalysis?: QuickCallAnalysis;
};

export type QuickCallAppointmentRequestDraft = {
  title: string;
  requestedStart: string | null;
  requestedEnd: string | null;
  confidence: number;
  extractedDetails: Json;
};

const DEFAULT_TIMEZONE = "Europe/Rome";
const DEFAULT_DURATION_MINUTES = 30;
const MAX_ALTERNATIVES = 3;

const RESCHEDULE_KEYWORDS = ["spostare", "sposta", "rinviare", "rinvia", "reschedule", "move"];
const CANCEL_KEYWORDS = ["annullare", "disdire", "cancellare", "cancella", "cancel"];
const CALLBACK_KEYWORDS = ["richiamare", "richiamarlo", "richiamarla", "call back", "callback", "recall"];
const APPOINTMENT_KEYWORDS = [
  "appuntamento",
  "preventivo",
  "call",
  "riunione",
  "venire",
  "passare",
  "incontrare",
  "appointment",
  "meeting",
  "schedule",
];

export function analyzeQuickCallNote(rawText: string, context: QuickCallContext = {}): QuickCallAnalysis {
  const timezone = context.timezone ?? DEFAULT_TIMEZONE;
  const intentType = detectQuickCallIntent(rawText);
  const entities = extractQuickCallEntities(rawText, timezone);
  const missingFields = buildMissingFields(intentType, entities);
  const needsMoreInfo = missingFields.length > 0;
  const confidence = scoreConfidence(rawText, intentType, entities);
  const suggestedReplyChannel = entities.customerPhone
    ? "whatsapp"
    : entities.customerEmail
      ? "email"
      : "manual_review";

  const analysis: QuickCallAnalysis = {
    intentType,
    confidence,
    customerName: entities.customerName,
    customerEmail: entities.customerEmail,
    customerPhone: entities.customerPhone,
    requestedDateTimeText: entities.requestedDateTimeText,
    requestedStartsAt: entities.requestedStartsAt,
    requestedEndsAt: entities.requestedEndsAt,
    reason: entities.reason,
    needsMoreInfo,
    missingFields,
    extractedConstraints: {
      timezone,
      originalText: rawText,
      detectedIntent: intentType,
      keywordMatches: matchKeywords(rawText),
    },
    suggestedReplyChannel,
    suggestedReplyBody: null,
  };

  return {
    ...analysis,
    suggestedReplyBody: needsMoreInfo
      ? generateNeedMoreInfoMessage(null, analysis)
      : generateCallFollowupMessage(null, analysis, suggestedReplyChannel),
  };
}

export function detectQuickCallIntent(rawText: string): QuickCallIntentType {
  const text = normalize(rawText);

  if (!text.trim()) {
    return "unknown";
  }

  if (containsAny(text, RESCHEDULE_KEYWORDS)) {
    return "reschedule_appointment";
  }

  if (containsAny(text, CANCEL_KEYWORDS)) {
    return "cancel_appointment";
  }

  if (containsAny(text, CALLBACK_KEYWORDS)) {
    return "callback_request";
  }

  if (containsDateSignal(text) || containsAny(text, APPOINTMENT_KEYWORDS)) {
    return "new_appointment";
  }

  return text.length > 12 ? "generic_note" : "unknown";
}

export function extractQuickCallEntities(rawText: string, timezone = DEFAULT_TIMEZONE) {
  const text = rawText.trim();
  const lower = normalize(text);
  const customerEmail = extractEmail(text);
  const customerPhone = extractPhone(text);
  const customerName = extractCustomerName(text);
  const requestedDateTimeText = extractDateTimeText(text);
  const range = parseDateTimeRange(lower, timezone);

  return {
    customerName,
    customerEmail,
    customerPhone,
    requestedDateTimeText,
    requestedStartsAt: range.start,
    requestedEndsAt: range.end,
    reason: inferReason(text),
  };
}

export function buildAppointmentRequestFromCallNote(
  callNote: QuickCallNote | null,
  analysis: QuickCallAnalysis,
): QuickCallAppointmentRequestDraft {
  return {
    title: analysis.reason ?? "Phone call appointment request",
    requestedStart: analysis.requestedStartsAt,
    requestedEnd: analysis.requestedEndsAt,
    confidence: analysis.confidence,
    extractedDetails: {
      source: "quick_call",
      callNoteId: callNote?.id ?? null,
      customerName: analysis.customerName,
      customerEmail: analysis.customerEmail,
      customerPhone: analysis.customerPhone,
      requestedDateTimeText: analysis.requestedDateTimeText,
      reason: analysis.reason,
      needsMoreInfo: analysis.needsMoreInfo,
      missingFields: analysis.missingFields,
      extractedConstraints: analysis.extractedConstraints,
    },
  };
}

export function buildQuickCallSuggestedActions(
  callNote: QuickCallNote | null,
  analysis: QuickCallAnalysis,
  calendarAvailability: AvailabilitySlot[] = [],
): QuickCallSuggestedActionDraft[] {
  const actions: QuickCallSuggestedActionDraft[] = [];
  const basePayload = {
    source: "quick_call",
    callNoteId: callNote?.id ?? null,
    customerName: analysis.customerName,
    customerEmail: analysis.customerEmail,
    customerPhone: analysis.customerPhone,
    requestedStartsAt: analysis.requestedStartsAt,
    requestedEndsAt: analysis.requestedEndsAt,
    requestedDateTimeText: analysis.requestedDateTimeText,
    reason: analysis.reason,
    alternatives: calendarAvailability,
    aiProvider: analysis.aiProvider ?? "heuristic",
    aiModel: analysis.aiModel ?? null,
    usedFallback: analysis.usedFallback ?? true,
    confidence: analysis.confidence,
    safetyNotes: analysis.safetyNotes ?? [],
    missingFields: analysis.missingFields,
  };

  if (analysis.needsMoreInfo) {
    actions.push({
      actionType: "request_call_more_info",
      title: "Request more information from phone call",
      rationale: "The call note is missing customer or scheduling details and needs user review.",
      draftPayload: {
        ...basePayload,
        body: generateNeedMoreInfoMessage(callNote, analysis),
        missingFields: analysis.missingFields,
      },
      riskLevel: "normal",
    });
  }

  if (analysis.intentType === "new_appointment" && analysis.requestedStartsAt && analysis.requestedEndsAt) {
    actions.push({
      actionType: "create_calendar_event_from_call",
      title: "Create calendar event from phone call",
      rationale: "Calendar creation proposal from Quick Call Note awaiting explicit approval.",
      draftPayload: {
        ...basePayload,
        title: analysis.reason ?? "Appointment from phone call",
      },
      riskLevel: "high",
    });
  }

  if (analysis.intentType === "reschedule_appointment") {
    actions.push({
      actionType: "update_calendar_event_from_call",
      title: "Reschedule calendar event from phone call",
      rationale: "Calendar reschedule proposal from Quick Call Note awaiting explicit approval.",
      draftPayload: basePayload,
      riskLevel: "high",
    });
  }

  if (analysis.intentType === "cancel_appointment") {
    actions.push({
      actionType: "cancel_calendar_event_from_call",
      title: "Cancel calendar event from phone call",
      rationale: "Calendar cancellation proposal from Quick Call Note awaiting explicit approval.",
      draftPayload: basePayload,
      riskLevel: "critical",
    });
  }

  if (analysis.intentType === "callback_request") {
    actions.push({
      actionType: "callback_reminder",
      title: "Create callback reminder",
      rationale: "Callback reminder proposal from phone call awaiting explicit approval.",
      draftPayload: {
        ...basePayload,
        body: generateCallFollowupMessage(callNote, analysis, "manual_review"),
      },
      riskLevel: "normal",
    });
  }

  const followup = buildFollowupAction(callNote, analysis, calendarAvailability);

  if (followup) {
    actions.push(followup);
  }

  if (actions.length === 0) {
    actions.push({
      actionType: "manual_review",
      title: "Review phone call note",
      rationale: "The call note could not be converted into a confident action.",
      draftPayload: basePayload,
      riskLevel: "normal",
    });
  }

  return actions;
}

export function generateCallFollowupMessage(
  callNote: QuickCallNote | null,
  analysis: QuickCallAnalysis,
  channel: QuickCallAnalysis["suggestedReplyChannel"],
): string {
  void callNote;
  const name = analysis.customerName ? ` ${analysis.customerName}` : "";
  const requested = analysis.requestedStartsAt ? ` for ${formatDateTime(analysis.requestedStartsAt)}` : "";
  const reason = analysis.reason ? ` about ${analysis.reason}` : "";

  if (analysis.intentType === "callback_request") {
    return `Hi${name}, thanks for your call. I noted that we should call you back${requested || " soon"}${reason}.`;
  }

  if (analysis.intentType === "cancel_appointment") {
    return `Hi${name}, thanks for your call. I noted the cancellation request${reason}. We will confirm after review.`;
  }

  if (analysis.intentType === "reschedule_appointment") {
    return `Hi${name}, thanks for your call. I noted the request to reschedule${requested}. We will confirm once reviewed.`;
  }

  if (channel === "manual_review") {
    return `Phone call noted${requested}${reason}. Review the details before contacting the customer.`;
  }

  return `Hi${name}, thanks for your call. I noted your appointment request${requested}${reason}. We will confirm once reviewed.`;
}

export function generateNeedMoreInfoMessage(
  callNote: QuickCallNote | null,
  analysis: QuickCallAnalysis,
): string {
  void callNote;
  const missing = analysis.missingFields.length
    ? analysis.missingFields.join(", ")
    : "a few details";
  const name = analysis.customerName ? ` ${analysis.customerName}` : "";

  return `Hi${name}, thanks for your call. I need ${missing} before confirming the next step.`;
}

export function suggestQuickCallAlternativeSlots(
  events: NormalizedCalendarEvent[],
  userRules: UserRule[] = [],
  analysis: QuickCallAnalysis,
): AvailabilitySlot[] {
  const requiredDurationMinutes = readRequiredDurationMinutesFromConstraints(analysis.extractedConstraints);
  const rules = { userRules, durationMinutes: requiredDurationMinutes };

  if (analysis.requestedStartsAt) {
    const requestedEnd = analysis.requestedEndsAt
      ?? new Date(new Date(analysis.requestedStartsAt).getTime() + requiredDurationMinutes * 60_000).toISOString();
    const alternatives = suggestAlternativeSlots(events, rules, analysis.requestedStartsAt, requestedEnd).slice(0, MAX_ALTERNATIVES);
    return filterAlternativesForBrainConstraints(alternatives, analysis.extractedConstraints);
  }

  const start = new Date(Math.max(Date.now(), Date.now() + minutes(30))).toISOString();
  const endDate = new Date(Date.now());
  endDate.setUTCDate(endDate.getUTCDate() + 7);

  const alternatives = findAvailableSlots(
    events,
    rules,
    start,
    endDate.toISOString(),
  ).slice(0, MAX_ALTERNATIVES);

  return filterAlternativesForBrainConstraints(alternatives, analysis.extractedConstraints);
}

export async function analyzeQuickCallWithAI(
  rawText: string,
  context: QuickCallContext = {},
): Promise<QuickCallAnalysis> {
  const fallbackAnalysis = context.fallbackAnalysis ?? analyzeQuickCallNote(rawText, context);
  return analyzeQuickCallWithOpenAI(rawText, {
    timezone: context.timezone,
    fallbackAnalysis,
    brainContext: context.brainContext,
  });
}

function buildFollowupAction(
  callNote: QuickCallNote | null,
  analysis: QuickCallAnalysis,
  calendarAvailability: AvailabilitySlot[],
): QuickCallSuggestedActionDraft | null {
  if (analysis.suggestedReplyChannel === "manual_review" || !analysis.suggestedReplyBody) {
    return null;
  }

  return {
    actionType: analysis.suggestedReplyChannel === "whatsapp" ? "send_call_followup_whatsapp" : "send_call_followup_email",
    title: analysis.suggestedReplyChannel === "whatsapp" ? "Send WhatsApp follow-up from call" : "Send email follow-up from call",
    rationale: "Follow-up draft from Quick Call Note awaiting explicit approval.",
    draftPayload: {
      source: "quick_call",
      callNoteId: callNote?.id ?? null,
      provider: analysis.suggestedReplyChannel,
      recipientEmail: analysis.customerEmail,
      recipientPhone: analysis.customerPhone,
      recipientName: analysis.customerName,
      body: analysis.suggestedReplyBody,
      alternatives: calendarAvailability,
    },
    riskLevel: "normal",
  };
}

function buildMissingFields(intentType: QuickCallIntentType, entities: ReturnType<typeof extractQuickCallEntities>): string[] {
  const missing: string[] = [];

  if (!entities.customerName && !entities.customerEmail && !entities.customerPhone) {
    missing.push("customer");
  }

  if (["new_appointment", "reschedule_appointment", "callback_request"].includes(intentType)) {
    if (!entities.requestedStartsAt || !entities.requestedEndsAt) {
      missing.push("date/time");
    }
  }

  if (intentType === "unknown") {
    missing.push("intent");
  }

  return missing;
}

function scoreConfidence(
  rawText: string,
  intentType: QuickCallIntentType,
  entities: ReturnType<typeof extractQuickCallEntities>,
): number {
  if (intentType === "unknown") {
    return 0.1;
  }

  let score = 0.25;
  score += intentType === "generic_note" ? 0.05 : 0.2;
  score += entities.customerName || entities.customerEmail || entities.customerPhone ? 0.2 : 0;
  score += entities.requestedDateTimeText ? 0.2 : 0;
  score += rawText.trim().length > 24 ? 0.1 : 0;

  return Math.min(0.95, Number(score.toFixed(3)));
}

function matchKeywords(rawText: string): string[] {
  const text = normalize(rawText);
  return [...RESCHEDULE_KEYWORDS, ...CANCEL_KEYWORDS, ...CALLBACK_KEYWORDS, ...APPOINTMENT_KEYWORDS]
    .filter((keyword) => text.includes(keyword));
}

function extractCustomerName(rawText: string): string | null {
  const text = rawText.trim();
  const patterns = [
    /^([A-ZÀ-Ü][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ü][\wÀ-ÿ'-]+){0,3})\s+(?:vuole|chiede|ha chiamato|called|wants|asks)/,
    /(?:cliente|sig\.?|signor|signora|dott\.?)\s+([A-ZÀ-Ü][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ü][\wÀ-ÿ'-]+){0,3})/,
    /(Studio\s+[A-ZÀ-Ü][\wÀ-ÿ'-]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1] && !/senza nome/i.test(match[1])) {
      return match[1].trim();
    }
  }

  if (/cliente senza nome/i.test(text)) {
    return null;
  }

  return null;
}

function extractEmail(text: string): string | null {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function extractPhone(text: string): string | null {
  return text.match(/(?:\+?\d[\d\s().-]{6,}\d)/)?.[0].replace(/\s+/g, " ") ?? null;
}

function extractDateTimeText(text: string): string | null {
  const lower = normalize(text);
  const signals = [
    "oggi",
    "domani",
    "dopodomani",
    "prossima settimana",
    "next week",
    "today",
    "tomorrow",
    "mattina",
    "pomeriggio",
    "sera",
    "morning",
    "afternoon",
  ];
  const weekdays = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica", "monday", "tuesday", "wednesday", "thursday", "friday"];
  const hasSignal = [...signals, ...weekdays].some((signal) => lower.includes(signal));
  const time = lower.match(/\b(?:alle\s*)?([01]?\d|2[0-3])(?::|\.|\s*e\s*)?([0-5]\d)?\b/);

  if (!hasSignal && !time) {
    return null;
  }

  const pieces = [...signals, ...weekdays].filter((signal) => lower.includes(signal));

  if (time?.[0]) {
    pieces.push(time[0]);
  }

  return pieces.join(" ").trim() || null;
}

function parseDateTimeRange(text: string, timezone: string): { start: string | null; end: string | null } {
  void timezone;
  const day = resolveRequestedDay(text);

  if (!day) {
    return { start: null, end: null };
  }

  const time = resolveRequestedTime(text);
  day.setHours(time.hour, time.minute, 0, 0);

  const end = new Date(day);
  end.setMinutes(end.getMinutes() + DEFAULT_DURATION_MINUTES);

  return {
    start: day.toISOString(),
    end: end.toISOString(),
  };
}

function resolveRequestedDay(text: string): Date | null {
  const now = new Date();
  const date = new Date(now);

  if (text.includes("domani") || text.includes("tomorrow")) {
    date.setDate(date.getDate() + 1);
    return date;
  }

  if (text.includes("dopodomani")) {
    date.setDate(date.getDate() + 2);
    return date;
  }

  if (text.includes("prossima settimana") || text.includes("next week")) {
    date.setDate(date.getDate() + 7);
    return date;
  }

  if (text.includes("oggi") || text.includes("today")) {
    return date;
  }

  const weekday = findWeekday(text);

  if (weekday !== null) {
    const current = date.getDay();
    const delta = (weekday - current + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
    return date;
  }

  return containsDateSignal(text) ? date : null;
}

function resolveRequestedTime(text: string): { hour: number; minute: number } {
  const explicit = text.match(/\b(?:alle\s*)?([01]?\d|2[0-3])(?::|\.|\s*e\s*)?([0-5]\d)?\b/);

  if (explicit) {
    return {
      hour: Number(explicit[1]),
      minute: explicit[2] ? Number(explicit[2]) : 0,
    };
  }

  if (text.includes("mattina") || text.includes("morning")) {
    return { hour: 9, minute: 0 };
  }

  if (text.includes("pomeriggio") || text.includes("afternoon")) {
    return { hour: 15, minute: 0 };
  }

  if (text.includes("sera") || text.includes("evening")) {
    return { hour: 18, minute: 0 };
  }

  return { hour: 9, minute: 0 };
}

function findWeekday(text: string): number | null {
  const map: Array<[string, number]> = [
    ["lunedi", 1],
    ["monday", 1],
    ["martedi", 2],
    ["tuesday", 2],
    ["mercoledi", 3],
    ["wednesday", 3],
    ["giovedi", 4],
    ["thursday", 4],
    ["venerdi", 5],
    ["friday", 5],
    ["sabato", 6],
    ["saturday", 6],
    ["domenica", 0],
    ["sunday", 0],
  ];

  return map.find(([label]) => text.includes(label))?.[1] ?? null;
}

function containsDateSignal(text: string): boolean {
  return /oggi|domani|dopodomani|prossima settimana|next week|today|tomorrow|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|monday|tuesday|wednesday|thursday|friday|mattina|pomeriggio|morning|afternoon/i.test(text);
}

function inferReason(rawText: string): string | null {
  const text = rawText.trim();

  if (!text) {
    return null;
  }

  const reasonMatch = text.match(/(?:per|about|for)\s+(.+)$/i);
  return (reasonMatch?.[1] ?? text).slice(0, 160);
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
