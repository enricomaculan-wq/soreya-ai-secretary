import type {
  AIAppointmentAnalysis,
  AvailabilitySlot,
  CalendarConflict,
  ConnectedWhatsAppAccount,
  Json,
  NormalizedWhatsAppMessage,
  UserRule,
  WhatsAppAppointmentIntent,
} from "@soreya/shared";

import { analyzeAppointmentTextWithAI } from "./appointment-ai";

type RawRecord = Record<string, unknown>;

export type WhatsAppAppointmentRequestDraft = {
  organizationId: string;
  title: string;
  requestedStart: string | null;
  requestedEnd: string | null;
  requestedTimezone: string | null;
  confidence: number;
  extractedDetails: Json;
};

export type WhatsAppReplyDraft = {
  body: string;
  recipientPhone: string;
};

export type WhatsAppPriority = "low" | "normal" | "high";

export type WhatsAppAIContext = {
  userRules?: UserRule[];
  timezone?: string;
  calendarAvailability?: AvailabilitySlot[] | CalendarConflict | null;
};

const APPOINTMENT_KEYWORDS = [
  "appointment",
  "meeting",
  "call",
  "schedule",
  "book",
  "availability",
  "available",
  "meet",
  "reschedule",
  "appuntamento",
  "riunione",
  "chiamata",
  "telefonata",
  "prenotare",
  "prenotazione",
  "disponibile",
  "disponibilita",
  "fissare",
  "spostare",
];

const URGENT_KEYWORDS = ["urgent", "asap", "today", "emergency", "urgente", "subito", "oggi"];

export function normalizeWhatsAppWebhookMessage(
  rawMessage: RawRecord,
  account: ConnectedWhatsAppAccount,
): NormalizedWhatsAppMessage {
  const text = toRecord(rawMessage.text);
  const providerMessageId = readString(rawMessage.id) ?? "unknown-whatsapp-message";
  const fromPhone = readString(rawMessage.from);
  const timestamp = readString(rawMessage.timestamp);
  const receivedAt = timestamp
    ? new Date(Number(timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const now = new Date().toISOString();

  return {
    id: providerMessageId,
    organizationId: account.organizationId,
    provider: "whatsapp_business_cloud",
    providerMessageId,
    providerThreadId: fromPhone,
    whatsappAccountId: account.id,
    fromPhone,
    fromName: readString(rawMessage.profileName),
    toPhoneNumberId: account.phoneNumberId,
    messageType: readString(rawMessage.type) ?? "text",
    textBody: readString(text.body),
    receivedAt,
    raw: rawMessage as Json,
    createdAt: now,
    updatedAt: now,
  };
}

export function detectWhatsAppAppointmentIntent(
  message: NormalizedWhatsAppMessage,
  userRules: UserRule[] = [],
  timezone = "Europe/Rome",
): WhatsAppAppointmentIntent {
  const text = [message.textBody].filter(Boolean).join("\n").toLowerCase();
  const keywordMatches = APPOINTMENT_KEYWORDS.filter((keyword) => text.includes(keyword));
  const dateTimeText = extractDateTimeText(text);
  const parsedRange = parseSimpleDateTime(dateTimeText, timezone);
  const confidence = Math.min(
    0.95,
    keywordMatches.length * 0.2 + (dateTimeText ? 0.35 : 0) + (message.fromPhone ? 0.1 : 0),
  );
  const isAppointmentRequest = confidence >= 0.35;
  const requiresExplicitDate = userRules.some((rule) =>
    `${rule.title} ${rule.instruction}`.toLowerCase().includes("date required"),
  );
  const needsMoreInfo = isAppointmentRequest && (!parsedRange.start || !parsedRange.end || requiresExplicitDate);

  return {
    isAppointmentRequest,
    confidence,
    requestedDateTimeText: dateTimeText,
    requestedStartsAt: parsedRange.start,
    requestedEndsAt: parsedRange.end,
    timezone,
    customerName: message.fromName,
    customerPhone: message.fromPhone,
    reason: inferReason(message),
    needsMoreInfo,
    extractedConstraints: {
      keywordMatches,
      requiresExplicitDate,
    },
  };
}

export function buildAppointmentRequestFromWhatsAppIntent(
  message: NormalizedWhatsAppMessage,
  intent: WhatsAppAppointmentIntent,
): WhatsAppAppointmentRequestDraft {
  return {
    organizationId: message.organizationId,
    title: intent.reason ?? "WhatsApp appointment request",
    requestedStart: intent.requestedStartsAt,
    requestedEnd: intent.requestedEndsAt,
    requestedTimezone: intent.timezone,
    confidence: intent.confidence,
    extractedDetails: {
      provider: message.provider,
      providerMessageId: message.providerMessageId,
      customerName: intent.customerName,
      customerPhone: intent.customerPhone,
      reason: intent.reason,
      requestedDateTimeText: intent.requestedDateTimeText,
      needsMoreInfo: intent.needsMoreInfo,
      extractedConstraints: intent.extractedConstraints,
    },
  };
}

export function generateWhatsAppReplyDraft(
  message: NormalizedWhatsAppMessage,
  appointmentRequest: WhatsAppAppointmentRequestDraft | { requested_start?: string | null; requested_end?: string | null },
  calendarAvailability: AvailabilitySlot[] | CalendarConflict | null,
): WhatsAppReplyDraft {
  const alternatives = Array.isArray(calendarAvailability)
    ? calendarAvailability
    : calendarAvailability?.alternatives ?? [];
  const requestedStart = "requestedStart" in appointmentRequest
    ? appointmentRequest.requestedStart
    : appointmentRequest.requested_start ?? null;

  let body = "Ciao";
  body += message.fromName ? ` ${message.fromName}` : "";
  body += ", grazie per il messaggio.";

  if (requestedStart) {
    body += ` Ho preso nota della richiesta per ${formatDateTime(requestedStart)}.`;
  } else {
    body += " Per controllare la disponibilita mi serve ancora data e orario preferiti.";
  }

  if (alternatives.length > 0) {
    body += "\n\nSlot alternativi disponibili:";
    body += alternatives
      .slice(0, 3)
      .map((slot) => `\n- ${formatDateTime(slot.startsAt)}`)
      .join("");
  }

  body += "\n\nConfermi cosa preferisci?";

  return {
    body,
    recipientPhone: message.fromPhone ?? "",
  };
}

export function generateWhatsAppNeedMoreInfoReply(
  message: NormalizedWhatsAppMessage,
  missingFields: string[],
): WhatsAppReplyDraft {
  const fields = missingFields.length ? missingFields : ["data", "orario"];

  return {
    recipientPhone: message.fromPhone ?? "",
    body: `Ciao${message.fromName ? ` ${message.fromName}` : ""}, grazie per il messaggio. Puoi inviarmi ${fields.join(" e ")} preferiti cosi controllo la disponibilita?`,
  };
}

export function classifyWhatsAppPriority(message: NormalizedWhatsAppMessage): WhatsAppPriority {
  const text = (message.textBody ?? "").toLowerCase();

  if (URGENT_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return "high";
  }

  if (detectWhatsAppAppointmentIntent(message).isAppointmentRequest) {
    return "normal";
  }

  return "low";
}

export async function analyzeWhatsAppWithAI(
  message: NormalizedWhatsAppMessage,
  context: WhatsAppAIContext = {},
): Promise<WhatsAppAppointmentIntent> {
  const heuristic = detectWhatsAppAppointmentIntent(message, context.userRules, context.timezone);
  const aiAnalysis = await analyzeAppointmentTextWithAI({
    source: "whatsapp",
    text: message.textBody ?? "",
    timezone: context.timezone ?? heuristic.timezone ?? undefined,
    customerName: message.fromName,
    customerPhone: message.fromPhone,
    fallbackAnalysis: whatsappIntentToAIAnalysis(heuristic),
    context: {
      provider: message.provider,
      messageType: message.messageType,
      userRules: context.userRules?.map((rule) => ({ title: rule.title, instruction: rule.instruction })),
    },
  });

  return aiAnalysisToWhatsAppIntent(aiAnalysis);
}

function whatsappIntentToAIAnalysis(intent: WhatsAppAppointmentIntent): AIAppointmentAnalysis {
  return {
    isAppointmentRequest: intent.isAppointmentRequest,
    intentType: intent.intentType ?? "new_appointment",
    confidence: intent.confidence,
    customerName: intent.customerName,
    customerEmail: null,
    customerPhone: intent.customerPhone,
    requestedDateTimeText: intent.requestedDateTimeText,
    requestedStartsAt: intent.requestedStartsAt,
    requestedEndsAt: intent.requestedEndsAt,
    timezone: intent.timezone,
    reason: intent.reason,
    needsMoreInfo: intent.needsMoreInfo,
    missingFields: intent.missingFields ?? missingFieldsFromIntent(intent),
    extractedConstraints: intent.extractedConstraints,
    priority: intent.priority ?? "normal",
    suggestedReplyTone: intent.suggestedReplyTone ?? "professional",
    suggestedReplyBody: intent.suggestedReplyBody ?? null,
    safetyNotes: intent.safetyNotes ?? [],
    aiProvider: intent.aiProvider ?? "heuristic",
    aiModel: intent.aiModel ?? null,
    usedFallback: intent.usedFallback ?? true,
  };
}

function aiAnalysisToWhatsAppIntent(analysis: AIAppointmentAnalysis): WhatsAppAppointmentIntent {
  return {
    isAppointmentRequest: analysis.isAppointmentRequest,
    intentType: analysis.intentType,
    confidence: analysis.confidence,
    requestedDateTimeText: analysis.requestedDateTimeText,
    requestedStartsAt: analysis.requestedStartsAt,
    requestedEndsAt: analysis.requestedEndsAt,
    timezone: analysis.timezone,
    customerName: analysis.customerName,
    customerPhone: analysis.customerPhone,
    reason: analysis.reason,
    needsMoreInfo: analysis.needsMoreInfo,
    missingFields: analysis.missingFields,
    extractedConstraints: analysis.extractedConstraints,
    priority: analysis.priority,
    suggestedReplyTone: analysis.suggestedReplyTone,
    suggestedReplyBody: analysis.suggestedReplyBody,
    safetyNotes: analysis.safetyNotes,
    aiProvider: analysis.aiProvider,
    aiModel: analysis.aiModel,
    usedFallback: analysis.usedFallback,
  };
}

function missingFieldsFromIntent(intent: WhatsAppAppointmentIntent): string[] {
  const missing: string[] = [];

  if (!intent.customerName && !intent.customerPhone) {
    missing.push("customer");
  }

  if (!intent.requestedStartsAt || !intent.requestedEndsAt) {
    missing.push("date/time");
  }

  return missing;
}

function extractDateTimeText(text: string): string | null {
  const isoLike = text.match(/\b\d{4}-\d{2}-\d{2}(?:[ t]\d{1,2}:\d{2})?\b/);
  if (isoLike) {
    return isoLike[0];
  }

  const relative = text.match(/\b(?:tomorrow|today|domani|oggi|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|lunedì|martedì|mercoledì|giovedì|venerdì)\b(?:[^.\n]{0,40})?(?:\d{1,2}(?::\d{2})?\s?(?:am|pm)?)?/);
  return relative?.[0]?.trim() ?? null;
}

function parseSimpleDateTime(value: string | null, timezone: string): { start: string | null; end: string | null } {
  void timezone;

  if (!value) {
    return { start: null, end: null };
  }

  const now = new Date();
  const lower = value.toLowerCase();
  let start: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    start = new Date(value.includes(":") ? value : `${value}T09:00:00`);
  } else if (lower.includes("tomorrow") || lower.includes("domani")) {
    start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(readHour(value) ?? 9, readMinute(value), 0, 0);
  } else if (lower.includes("today") || lower.includes("oggi")) {
    start = new Date(now);
    start.setHours(readHour(value) ?? Math.max(now.getHours() + 1, 9), readMinute(value), 0, 0);
  }

  if (!start || Number.isNaN(start.getTime())) {
    return { start: null, end: null };
  }

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function readHour(value: string): number | null {
  const match = value.match(/\b(\d{1,2})(?::\d{2})?\s?(am|pm)?\b/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const meridiem = match[2]?.toLowerCase();

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  return hour;
}

function readMinute(value: string): number {
  const match = value.match(/\b\d{1,2}:(\d{2})/);
  return match ? Number(match[1]) : 0;
}

function inferReason(message: NormalizedWhatsAppMessage): string | null {
  return message.textBody?.slice(0, 120) ?? null;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "l'orario richiesto";
  }

  return new Intl.DateTimeFormat("it", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}
