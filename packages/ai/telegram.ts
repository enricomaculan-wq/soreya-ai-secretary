import type {
  AIAppointmentAnalysis,
  AvailabilitySlot,
  CalendarConflict,
  ConnectedTelegramAccount,
  Json,
  NormalizedTelegramMessage,
  OrganizationBrainContext,
  UserRule,
  TelegramAppointmentIntent,
} from "@soreya/shared";

import { analyzeAppointmentTextWithAI } from "./appointment-ai";
import { applyBrainEnrichmentToAnalysis, brainContextToJson } from "./brain";
import { resolveSchedulingEmailReplyBody } from "./email";

type RawRecord = Record<string, unknown>;

export type TelegramAppointmentRequestDraft = {
  organizationId: string;
  title: string;
  requestedStart: string | null;
  requestedEnd: string | null;
  requestedTimezone: string | null;
  confidence: number;
  extractedDetails: Json;
};

export type TelegramReplyDraft = {
  body: string;
  recipientChatId: string;
};

export type TelegramPriority = "low" | "normal" | "high";

export type TelegramAIContext = {
  userRules?: UserRule[];
  timezone?: string;
  calendarAvailability?: AvailabilitySlot[] | CalendarConflict | null;
  brainContext?: OrganizationBrainContext;
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

export function normalizeTelegramWebhookMessage(
  rawMessage: RawRecord,
  account: ConnectedTelegramAccount,
): NormalizedTelegramMessage {
  const chat = toRecord(rawMessage.chat);
  const from = toRecord(rawMessage.from);
  const providerMessageId = readString(rawMessage.message_id) ?? "unknown-telegram-message";
  const chatId = readChatId(chat.id);
  const timestamp = typeof rawMessage.date === "number" ? rawMessage.date : null;
  const receivedAt = timestamp
    ? new Date(timestamp * 1000).toISOString()
    : new Date().toISOString();
  const now = new Date().toISOString();
  const textBody = readString(rawMessage.text) ?? readString(toRecord(rawMessage.caption).text);

  return {
    id: providerMessageId,
    organizationId: account.organizationId,
    provider: "telegram_bot",
    providerMessageId,
    providerThreadId: chatId,
    telegramAccountId: account.id,
    fromChatId: chatId,
    fromName: [readString(from.first_name), readString(from.last_name)].filter(Boolean).join(" ") || null,
    fromUsername: readString(from.username),
    messageType: textBody ? "text" : readString(rawMessage.type) ?? "unknown",
    textBody,
    receivedAt,
    raw: rawMessage as Json,
    createdAt: now,
    updatedAt: now,
  };
}

export function detectTelegramAppointmentIntent(
  message: NormalizedTelegramMessage,
  userRules: UserRule[] = [],
  timezone = "Europe/Rome",
): TelegramAppointmentIntent {
  const text = [message.textBody].filter(Boolean).join("\n").toLowerCase();
  const keywordMatches = APPOINTMENT_KEYWORDS.filter((keyword) => text.includes(keyword));
  const dateTimeText = extractDateTimeText(text);
  const parsedRange = parseSimpleDateTime(dateTimeText, timezone);
  const confidence = Math.min(
    0.95,
    keywordMatches.length * 0.2 + (dateTimeText ? 0.35 : 0) + (message.fromChatId ? 0.1 : 0),
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
    customerName: message.fromName ?? message.fromUsername,
    customerPhone: null,
    reason: inferReason(message),
    needsMoreInfo,
    extractedConstraints: {
      keywordMatches,
      requiresExplicitDate,
    },
  };
}

export function buildAppointmentRequestFromTelegramIntent(
  message: NormalizedTelegramMessage,
  intent: TelegramAppointmentIntent,
): TelegramAppointmentRequestDraft {
  return {
    organizationId: message.organizationId,
    title: intent.reason ?? "Telegram appointment request",
    requestedStart: intent.requestedStartsAt,
    requestedEnd: intent.requestedEndsAt,
    requestedTimezone: intent.timezone,
    confidence: intent.confidence,
    extractedDetails: {
      provider: message.provider,
      providerMessageId: message.providerMessageId,
      customerName: intent.customerName,
      customerChatId: message.fromChatId,
      reason: intent.reason,
      requestedDateTimeText: intent.requestedDateTimeText,
      needsMoreInfo: intent.needsMoreInfo,
      extractedConstraints: intent.extractedConstraints,
    },
  };
}

export function generateTelegramReplyDraft(
  message: NormalizedTelegramMessage,
  appointmentRequest: TelegramAppointmentRequestDraft | { requested_start?: string | null; requested_end?: string | null },
  calendarAvailability: AvailabilitySlot[] | CalendarConflict | null,
): TelegramReplyDraft {
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
    recipientChatId: message.fromChatId ?? "",
  };
}

export function resolveSchedulingTelegramReplyBody(
  draftBody: string,
  suggestedReplyBody: string | null | undefined,
): string {
  return resolveSchedulingEmailReplyBody(draftBody, suggestedReplyBody);
}

export function generateTelegramNeedMoreInfoReply(
  message: NormalizedTelegramMessage,
  missingFields: string[],
): TelegramReplyDraft {
  const fields = missingFields.length ? missingFields : ["data", "orario"];

  return {
    recipientChatId: message.fromChatId ?? "",
    body: `Ciao${message.fromName ? ` ${message.fromName}` : ""}, grazie per il messaggio. Puoi inviarmi ${fields.join(" e ")} preferiti cosi controllo la disponibilita?`,
  };
}

export function classifyTelegramPriority(message: NormalizedTelegramMessage): TelegramPriority {
  const text = (message.textBody ?? "").toLowerCase();

  if (URGENT_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return "high";
  }

  if (detectTelegramAppointmentIntent(message).isAppointmentRequest) {
    return "normal";
  }

  return "low";
}

export async function analyzeTelegramWithAI(
  message: NormalizedTelegramMessage,
  context: TelegramAIContext = {},
): Promise<TelegramAppointmentIntent> {
  const heuristic = detectTelegramAppointmentIntent(message, context.userRules, context.timezone);
  const messageText = message.textBody ?? "";
  const aiAnalysis = await analyzeAppointmentTextWithAI({
    source: "telegram",
    text: messageText,
    timezone: context.timezone ?? heuristic.timezone ?? undefined,
    customerName: message.fromName ?? message.fromUsername,
    customerPhone: null,
    fallbackAnalysis: telegramIntentToAIAnalysis(heuristic),
    context: {
      provider: message.provider,
      messageType: message.messageType,
      userRules: context.userRules?.map((rule) => ({ title: rule.title, instruction: rule.instruction })),
      ...(context.brainContext ? brainContextToJson(context.brainContext) : {}),
    },
  });
  const enrichedAnalysis = context.brainContext
    ? applyBrainEnrichmentToAnalysis(context.brainContext, aiAnalysis, messageText)
    : aiAnalysis;

  return aiAnalysisToTelegramIntent(enrichedAnalysis);
}

function telegramIntentToAIAnalysis(intent: TelegramAppointmentIntent): AIAppointmentAnalysis {
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

function aiAnalysisToTelegramIntent(analysis: AIAppointmentAnalysis): TelegramAppointmentIntent {
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

function missingFieldsFromIntent(intent: TelegramAppointmentIntent): string[] {
  const missing: string[] = [];

  if (!intent.customerName) {
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

function inferReason(message: NormalizedTelegramMessage): string | null {
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

function readChatId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return readString(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}
