import type {
  AIAppointmentAnalysis,
  AppointmentIntent,
  AvailabilitySlot,
  CalendarConflict,
  ConnectedEmailAccount,
  Json,
  NormalizedEmailMessage,
  UserRule,
} from "@soreya/shared";

import { analyzeAppointmentTextWithAI } from "./appointment-ai";

type RawRecord = Record<string, unknown>;

export type AppointmentRequestDraft = {
  organizationId: string;
  title: string;
  requestedStart: string | null;
  requestedEnd: string | null;
  requestedTimezone: string | null;
  confidence: number;
  extractedDetails: Json;
};

export type EmailReplyDraft = {
  subject: string;
  body: string;
  recipient: string;
};

export type EmailPriority = "low" | "normal" | "high";

export type EmailAIContext = {
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
  "prenotare",
  "disponibile",
];

const URGENT_KEYWORDS = ["urgent", "asap", "today", "emergency", "urgente", "subito"];

export function normalizeGmailMessage(
  rawMessage: RawRecord,
  account: ConnectedEmailAccount,
): NormalizedEmailMessage {
  const payload = toRecord(rawMessage.payload);
  const headers = readHeaders(payload.headers);
  const body = extractGmailBody(payload);
  const providerMessageId = readString(rawMessage.id) ?? "unknown-gmail-message";
  const now = new Date().toISOString();
  const receivedAt = readGmailReceivedAt(rawMessage, headers) ?? now;
  const from = parseEmailAddress(headers.from);

  return {
    id: providerMessageId,
    organizationId: account.organizationId,
    provider: "gmail",
    providerMessageId,
    providerThreadId: readString(rawMessage.threadId),
    emailAccountId: account.id,
    fromEmail: from.email,
    fromName: from.name,
    toEmails: parseEmailList(headers.to),
    ccEmails: parseEmailList(headers.cc),
    subject: headers.subject ?? null,
    snippet: readString(rawMessage.snippet),
    bodyText: body.text,
    bodyHtml: body.html,
    receivedAt,
    hasAttachments: hasGmailAttachments(payload),
    raw: rawMessage as Json,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeMicrosoftMailMessage(
  rawMessage: RawRecord,
  account: ConnectedEmailAccount,
): NormalizedEmailMessage {
  const fromAddress = toRecord(toRecord(rawMessage.from).emailAddress);
  const providerMessageId = readString(rawMessage.id) ?? "unknown-microsoft-message";
  const now = new Date().toISOString();
  const body = toRecord(rawMessage.body);

  return {
    id: providerMessageId,
    organizationId: account.organizationId,
    provider: "microsoft",
    providerMessageId,
    providerThreadId: readString(rawMessage.conversationId),
    emailAccountId: account.id,
    fromEmail: readString(fromAddress.address),
    fromName: readString(fromAddress.name),
    toEmails: parseMicrosoftRecipients(rawMessage.toRecipients),
    ccEmails: parseMicrosoftRecipients(rawMessage.ccRecipients),
    subject: readString(rawMessage.subject),
    snippet: readString(rawMessage.bodyPreview),
    bodyText: readString(body.contentType)?.toLowerCase() === "text" ? readString(body.content) : readString(rawMessage.bodyPreview),
    bodyHtml: readString(body.contentType)?.toLowerCase() === "html" ? readString(body.content) : null,
    receivedAt: readString(rawMessage.receivedDateTime) ?? now,
    hasAttachments: Boolean(rawMessage.hasAttachments),
    raw: rawMessage as Json,
    createdAt: now,
    updatedAt: now,
  };
}

export function detectAppointmentIntent(
  message: NormalizedEmailMessage,
  userRules: UserRule[] = [],
  timezone = "Europe/Rome",
): AppointmentIntent {
  const text = [message.subject, message.snippet, message.bodyText, stripHtml(message.bodyHtml)]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  const keywordMatches = APPOINTMENT_KEYWORDS.filter((keyword) => text.includes(keyword));
  const dateTimeText = extractDateTimeText(text);
  const parsedRange = parseSimpleDateTime(dateTimeText, timezone);
  const confidence = Math.min(
    0.95,
    keywordMatches.length * 0.18 + (dateTimeText ? 0.35 : 0) + (message.fromEmail ? 0.1 : 0),
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
    customerEmail: message.fromEmail,
    customerPhone: extractPhone(text),
    reason: inferReason(message),
    needsMoreInfo,
    extractedConstraints: {
      keywordMatches,
      requiresExplicitDate,
    },
  };
}

export function buildAppointmentRequestFromIntent(
  message: NormalizedEmailMessage,
  intent: AppointmentIntent,
): AppointmentRequestDraft {
  return {
    organizationId: message.organizationId,
    title: message.subject ?? "Appointment request",
    requestedStart: intent.requestedStartsAt,
    requestedEnd: intent.requestedEndsAt,
    requestedTimezone: intent.timezone,
    confidence: intent.confidence,
    extractedDetails: {
      provider: message.provider,
      providerMessageId: message.providerMessageId,
      customerName: intent.customerName,
      customerEmail: intent.customerEmail,
      customerPhone: intent.customerPhone,
      reason: intent.reason,
      requestedDateTimeText: intent.requestedDateTimeText,
      needsMoreInfo: intent.needsMoreInfo,
      extractedConstraints: intent.extractedConstraints,
    },
  };
}

export function generateEmailReplyDraft(
  message: NormalizedEmailMessage,
  appointmentRequest: AppointmentRequestDraft | { requested_start?: string | null; requested_end?: string | null },
  calendarAvailability: AvailabilitySlot[] | CalendarConflict | null,
): EmailReplyDraft {
  const alternatives = Array.isArray(calendarAvailability)
    ? calendarAvailability
    : calendarAvailability?.alternatives ?? [];
  const requestedStart = "requestedStart" in appointmentRequest
    ? appointmentRequest.requestedStart
    : appointmentRequest.requested_start ?? null;
  const requestedEnd = "requestedEnd" in appointmentRequest
    ? appointmentRequest.requestedEnd
    : appointmentRequest.requested_end ?? null;
  const hasRequestedTime = Boolean(requestedStart && requestedEnd);
  const recipient = message.fromEmail ?? "";
  const subject = message.subject?.toLowerCase().startsWith("re:")
    ? message.subject
    : `Re: ${message.subject ?? "Appointment request"}`;

  let body = "Hi";
  body += message.fromName ? ` ${message.fromName}` : "";
  body += ",\n\n";

  if (hasRequestedTime) {
    body += `Thanks for your message. I can see the requested appointment time around ${formatDateTime(requestedStart)}.\n`;
  } else {
    body += "Thanks for your message. I can help with scheduling, but I need a little more information first.\n";
  }

  if (alternatives.length > 0) {
    body += "\nPossible alternative slots:\n";
    body += alternatives
      .slice(0, 3)
      .map((slot) => `- ${formatDateTime(slot.startsAt)} (${slot.durationMinutes} minutes)`)
      .join("\n");
    body += "\n";
  }

  body += "\nPlease confirm what works best.\n\nBest,\nSoreya";

  return { subject, body, recipient };
}

export function generateNeedMoreInfoReply(
  message: NormalizedEmailMessage,
  missingFields: string[],
): EmailReplyDraft {
  const fields = missingFields.length ? missingFields : ["preferred date", "preferred time"];

  return {
    subject: message.subject?.toLowerCase().startsWith("re:")
      ? message.subject
      : `Re: ${message.subject ?? "Appointment request"}`,
    recipient: message.fromEmail ?? "",
    body: `Hi${message.fromName ? ` ${message.fromName}` : ""},\n\nThanks for your message. Could you send ${fields.join(" and ")} so I can check availability?\n\nBest,\nSoreya`,
  };
}

export function classifyEmailPriority(message: NormalizedEmailMessage): EmailPriority {
  const text = [message.subject, message.snippet, message.bodyText].filter(Boolean).join(" ").toLowerCase();

  if (URGENT_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return "high";
  }

  if (detectAppointmentIntent(message).isAppointmentRequest) {
    return "normal";
  }

  return "low";
}

export async function analyzeEmailWithAI(
  message: NormalizedEmailMessage,
  context: EmailAIContext = {},
): Promise<AppointmentIntent> {
  const heuristic = detectAppointmentIntent(message, context.userRules, context.timezone);
  const aiAnalysis = await analyzeAppointmentTextWithAI({
    source: "email",
    text: [message.subject, message.snippet, message.bodyText, stripHtml(message.bodyHtml)].filter(Boolean).join("\n"),
    subject: message.subject,
    timezone: context.timezone ?? heuristic.timezone ?? undefined,
    customerName: message.fromName,
    customerEmail: message.fromEmail,
    fallbackAnalysis: appointmentIntentToAIAnalysis(heuristic),
    context: {
      provider: message.provider,
      fromEmail: message.fromEmail,
      userRules: context.userRules?.map((rule) => ({ title: rule.title, instruction: rule.instruction })),
    },
  });

  return aiAnalysisToAppointmentIntent(aiAnalysis);
}

function appointmentIntentToAIAnalysis(intent: AppointmentIntent): AIAppointmentAnalysis {
  return {
    isAppointmentRequest: intent.isAppointmentRequest,
    intentType: intent.intentType ?? "new_appointment",
    confidence: intent.confidence,
    customerName: intent.customerName,
    customerEmail: intent.customerEmail,
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

function aiAnalysisToAppointmentIntent(analysis: AIAppointmentAnalysis): AppointmentIntent {
  return {
    isAppointmentRequest: analysis.isAppointmentRequest,
    intentType: analysis.intentType,
    confidence: analysis.confidence,
    requestedDateTimeText: analysis.requestedDateTimeText,
    requestedStartsAt: analysis.requestedStartsAt,
    requestedEndsAt: analysis.requestedEndsAt,
    timezone: analysis.timezone,
    customerName: analysis.customerName,
    customerEmail: analysis.customerEmail,
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

function missingFieldsFromIntent(intent: AppointmentIntent): string[] {
  const missing: string[] = [];

  if (!intent.customerName && !intent.customerEmail && !intent.customerPhone) {
    missing.push("customer");
  }

  if (!intent.requestedStartsAt || !intent.requestedEndsAt) {
    missing.push("date/time");
  }

  return missing;
}

function readHeaders(value: unknown): Record<string, string> {
  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<Record<string, string>>((accumulator, header) => {
    const record = toRecord(header);
    const name = readString(record.name)?.toLowerCase();
    const headerValue = readString(record.value);

    if (name && headerValue) {
      accumulator[name] = headerValue;
    }

    return accumulator;
  }, {});
}

function extractGmailBody(payload: RawRecord): { text: string | null; html: string | null } {
  const parts = flattenGmailParts(payload);
  const textPart = parts.find((part) => readString(part.mimeType) === "text/plain");
  const htmlPart = parts.find((part) => readString(part.mimeType) === "text/html");

  return {
    text: decodeGmailBody(toRecord(textPart?.body).data) ?? decodeGmailBody(toRecord(payload.body).data),
    html: decodeGmailBody(toRecord(htmlPart?.body).data),
  };
}

function flattenGmailParts(payload: RawRecord): RawRecord[] {
  const parts = Array.isArray(payload.parts) ? payload.parts.map(toRecord) : [];

  return parts.flatMap((part) => [part, ...flattenGmailParts(part)]);
}

function hasGmailAttachments(payload: RawRecord): boolean {
  return flattenGmailParts(payload).some((part) => Boolean(readString(toRecord(part.body).attachmentId)));
}

function decodeGmailBody(value: unknown): string | null {
  const encoded = readString(value);

  if (!encoded) {
    return null;
  }

  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized, "base64").toString("utf8");
  }

  return globalThis.atob(normalized);
}

function readGmailReceivedAt(rawMessage: RawRecord, headers: Record<string, string>): string | null {
  const internalDate = readString(rawMessage.internalDate);

  if (internalDate) {
    return new Date(Number(internalDate)).toISOString();
  }

  const dateHeader = headers.date;

  return dateHeader ? new Date(dateHeader).toISOString() : null;
}

function parseMicrosoftRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((recipient) => readString(toRecord(toRecord(recipient).emailAddress).address))
    .filter((email): email is string => Boolean(email));
}

function parseEmailList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => parseEmailAddress(entry).email)
    .filter((email): email is string => Boolean(email));
}

function parseEmailAddress(value: string | undefined): { name: string | null; email: string | null } {
  if (!value) {
    return { name: null, email: null };
  }

  const match = value.match(/^(?:"?([^"<]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);

  return {
    name: match?.[1]?.trim() || null,
    email: match?.[2]?.trim() || value.trim(),
  };
}

function extractDateTimeText(text: string): string | null {
  const isoLike = text.match(/\b\d{4}-\d{2}-\d{2}(?:[ t]\d{1,2}:\d{2})?\b/);
  if (isoLike) {
    return isoLike[0];
  }

  const dayMonth = text.match(/\b(?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b(?:[^.\n]{0,40})?(?:\d{1,2}(?::\d{2})?\s?(?:am|pm)?)?/);
  return dayMonth?.[0]?.trim() ?? null;
}

function parseSimpleDateTime(value: string | null, timezone: string): { start: string | null; end: string | null } {
  if (!value) {
    return { start: null, end: null };
  }

  const now = new Date();
  const lower = value.toLowerCase();
  let start: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    start = new Date(value.includes(":") ? value : `${value}T09:00:00`);
  } else if (lower.includes("tomorrow")) {
    start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(readHour(value) ?? 9, readMinute(value), 0, 0);
  } else if (lower.includes("today")) {
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

function extractPhone(text: string): string | null {
  return text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
}

function inferReason(message: NormalizedEmailMessage): string | null {
  return message.subject ?? message.snippet ?? null;
}

function stripHtml(value: string | null): string | null {
  return value?.replace(/<[^>]+>/g, " ") ?? null;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "the requested time";
  }

  return new Intl.DateTimeFormat("en", {
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
