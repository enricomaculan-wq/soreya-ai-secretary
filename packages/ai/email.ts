import type {
  AIAppointmentAnalysis,
  AppointmentIntent,
  AvailabilitySlot,
  CalendarConflict,
  ConnectedEmailAccount,
  Json,
  NormalizedEmailMessage,
  OrganizationBrainContext,
  UserRule,
} from "@soreya/shared";

import { analyzeAppointmentTextWithAI } from "./appointment-ai";
import { applyBrainEnrichmentToAnalysis, brainContextToJson } from "./brain";

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
  const isAppointmentRequest = confidence >= 0.35 || keywordMatches.length >= 1;
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
  const italian = isItalianMessage(message);
  const alternatives = Array.isArray(calendarAvailability)
    ? calendarAvailability
    : calendarAvailability?.alternatives ?? [];
  const conflictingEvents = Array.isArray(calendarAvailability)
    ? []
    : calendarAvailability?.conflictingEvents ?? [];
  const hasConflict = conflictingEvents.length > 0;
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
    : `Re: ${message.subject ?? (italian ? "Richiesta appuntamento" : "Appointment request")}`;

  let body = italian ? "Buongiorno" : "Hi";
  body += message.fromName ? ` ${message.fromName}` : "";
  body += ",\n\n";

  if (hasConflict && alternatives.length > 0 && hasRequestedTime) {
    body += italian
      ? `Grazie per il messaggio. Purtroppo ${formatAppointmentDateTime(requestedStart, italian)} non è disponibile. Le propongo questi orari:\n`
      : `Thanks for your message. Unfortunately ${formatAppointmentDateTime(requestedStart, italian)} is not available. Here are some alternatives:\n`;
    body += alternatives
      .slice(0, 3)
      .map((slot) => `- ${formatDateTime(slot.startsAt, italian)} (${slot.durationMinutes} ${italian ? "minuti" : "minutes"})`)
      .join("\n");
    body += italian
      ? "\n\nMi faccia sapere quale opzione preferisce.\n\nCordiali saluti,\nSoreya"
      : "\n\nPlease let me know which option works best.\n\nBest,\nSoreya";
  } else if (hasRequestedTime) {
    body += italian
      ? `Grazie per il messaggio. Ho preso nota della preferenza per ${formatDateTime(requestedStart, italian)}: verifico la disponibilità e le confermo a breve.\n\nCordiali saluti,\nSoreya`
      : `Thanks for your message. I noted your preference for ${formatDateTime(requestedStart, italian)}. I will check availability and confirm shortly.\n\nBest,\nSoreya`;
  } else {
    body += italian
      ? "Grazie per il messaggio. Posso aiutarla con l'appuntamento, ma mi servono ancora alcune informazioni.\n\nCordiali saluti,\nSoreya"
      : "Thanks for your message. I can help with scheduling, but I need a little more information first.\n\nBest,\nSoreya";
  }

  return { subject, body, recipient };
}

export function resolveSchedulingEmailReplyBody(
  calendarDraftBody: string,
  suggestedReplyBody: string | null | undefined,
): string {
  if (!suggestedReplyBody?.trim()) {
    return calendarDraftBody;
  }

  const additiveBlocks = suggestedReplyBody
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => isAdditiveReplyBlock(block, calendarDraftBody));

  if (additiveBlocks.length === 0) {
    return calendarDraftBody;
  }

  const salutationPattern = /\n\n(Cordiali saluti,\nSoreya|Best,\nSoreya)$/i;
  const salutationMatch = calendarDraftBody.match(salutationPattern);

  if (salutationMatch?.index !== undefined) {
    const insert = `\n\n${additiveBlocks.join("\n\n")}`;
    return `${calendarDraftBody.slice(0, salutationMatch.index)}${insert}${calendarDraftBody.slice(salutationMatch.index)}`;
  }

  return `${calendarDraftBody}\n\n${additiveBlocks.join("\n\n")}`;
}

function isAdditiveReplyBlock(block: string, calendarDraftBody: string) {
  const normalizedBlock = normalizeReplyComparisonText(block);
  const normalizedDraft = normalizeReplyComparisonText(calendarDraftBody);

  if (normalizedDraft.includes(normalizedBlock)) {
    return false;
  }

  return /^(per |for |per i servizi|for the requested|per il tempo necessario|the indicated availability)/i.test(block)
    || /^- .+:\s/.test(block);
}

function normalizeReplyComparisonText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateNeedMoreInfoReply(
  message: NormalizedEmailMessage,
  missingFields: string[],
): EmailReplyDraft {
  const italian = isItalianMessage(message);
  const fields = localizeMissingFields(missingFields.length ? missingFields : ["date/time"], italian);

  return {
    subject: message.subject?.toLowerCase().startsWith("re:")
      ? message.subject
      : `Re: ${message.subject ?? (italian ? "Richiesta appuntamento" : "Appointment request")}`,
    recipient: message.fromEmail ?? "",
    body: italian
      ? `Buongiorno${message.fromName ? ` ${message.fromName}` : ""},\n\nGrazie per il messaggio. Potrebbe indicarmi ${fields.join(" e ")} così verifico la disponibilità?\n\nCordiali saluti,\nSoreya`
      : `Hi${message.fromName ? ` ${message.fromName}` : ""},\n\nThanks for your message. Could you send ${fields.join(" and ")} so I can check availability?\n\nBest,\nSoreya`,
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
  const messageText = [message.subject, message.snippet, message.bodyText, stripHtml(message.bodyHtml)]
    .filter(Boolean)
    .join("\n");
  const aiAnalysis = await analyzeAppointmentTextWithAI({
    source: "email",
    text: messageText,
    subject: message.subject,
    timezone: context.timezone ?? heuristic.timezone ?? undefined,
    customerName: message.fromName,
    customerEmail: message.fromEmail,
    fallbackAnalysis: appointmentIntentToAIAnalysis(heuristic),
    context: {
      provider: message.provider,
      fromEmail: message.fromEmail,
      userRules: context.userRules?.map((rule) => ({ title: rule.title, instruction: rule.instruction })),
      ...(context.brainContext ? brainContextToJson(context.brainContext) : {}),
    },
  });
  const enrichedAnalysis = context.brainContext
    ? applyBrainEnrichmentToAnalysis(context.brainContext, aiAnalysis, messageText, isItalianMessage(message) ? "it-IT" : "en-US")
    : aiAnalysis;

  return aiAnalysisToAppointmentIntent(mergeAnalysisWithHeuristic(enrichedAnalysis, heuristic));
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

  const normalized = normalizeForMatch(text);

  const italianDay = normalized.match(
    /(?:questo\s+)?(?:lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)(?:\s+(?:pomeriggio|mattina|sera|prossimo))?/i,
  );
  if (italianDay) {
    return italianDay[0].trim();
  }

  const englishDay = normalized.match(
    /\b(?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|domani|oggi)\b(?:[^.\n]{0,40})?(?:\d{1,2}(?::\d{2})?\s?(?:am|pm)?)?/i,
  );
  return englishDay?.[0]?.trim() ?? null;
}

function parseSimpleDateTime(value: string | null, timezone: string): { start: string | null; end: string | null } {
  if (!value) {
    return { start: null, end: null };
  }

  const now = new Date();
  const lower = normalizeForMatch(value);
  let start: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    start = new Date(value.includes(":") ? value : `${value}T09:00:00`);
  } else if (lower.includes("today") || lower.includes("oggi")) {
    start = new Date(now);
    start.setHours(readHour(value) ?? Math.max(now.getHours() + 1, 9), readMinute(value), 0, 0);
  } else if (lower.includes("tomorrow") || lower.includes("domani")) {
    start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(readHour(value) ?? 9, readMinute(value), 0, 0);
  } else {
    const weekday = readItalianWeekdayOffset(lower, now);
    if (weekday !== null) {
      start = new Date(now);
      start.setDate(start.getDate() + weekday);
      start.setHours(readItalianDayPartHour(lower) ?? readHour(value) ?? 14, readMinute(value), 0, 0);
    }
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

function readItalianDayPartHour(text: string): number | null {
  if (text.includes("pomeriggio")) {
    return 15;
  }

  if (text.includes("mattina")) {
    return 10;
  }

  if (text.includes("sera")) {
    return 18;
  }

  return null;
}

function readItalianWeekdayOffset(text: string, now: Date): number | null {
  const normalized = normalizeForMatch(text);
  const weekdays = [
    { names: ["domenica"], index: 0 },
    { names: ["lunedi"], index: 1 },
    { names: ["martedi"], index: 2 },
    { names: ["mercoledi"], index: 3 },
    { names: ["giovedi"], index: 4 },
    { names: ["venerdi"], index: 5 },
    { names: ["sabato"], index: 6 },
  ];

  for (const weekday of weekdays) {
    if (weekday.names.some((name) => normalized.includes(name))) {
      const current = now.getDay();
      let delta = weekday.index - current;

      if (delta < 0) {
        delta += 7;
      }

      if (delta === 0 || normalized.includes("questo")) {
        return delta;
      }

      return delta;
    }
  }

  return null;
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

function formatDateTime(value: string | null | undefined, italian = false): string {
  if (!value) {
    return italian ? "l'orario richiesto" : "the requested time";
  }

  return new Intl.DateTimeFormat(italian ? "it-IT" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAppointmentDateTime(value: string | null | undefined, italian = false): string {
  if (!value) {
    return italian ? "l'orario richiesto" : "the requested time";
  }

  const date = new Date(value);

  if (italian) {
    const day = new Intl.DateTimeFormat("it-IT", { day: "numeric" }).format(date);
    const month = new Intl.DateTimeFormat("it-IT", { month: "long" }).format(date);
    const year = new Intl.DateTimeFormat("it-IT", { year: "numeric" }).format(date);
    const time = new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

    return `il giorno ${day} ${month} ${year} alle ore ${time}`;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function isItalianMessage(message: NormalizedEmailMessage): boolean {
  const text = [message.subject, message.snippet, message.bodyText, stripHtml(message.bodyHtml)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(buongiorno|salve|grazie|appuntamento|vorrei|cordiali|pomeriggio|martedi|giovedi)\b/.test(text)
    || /[àèéìòù]/i.test(text);
}

function localizeMissingFields(fields: string[], italian: boolean): string[] {
  if (!italian) {
    return fields.map((field) => {
      if (field === "date/time") {
        return "preferred date and time";
      }

      return field;
    });
  }

  return fields.map((field) => {
    if (field === "date/time" || field === "date" || field === "time") {
      return "giorno e orario preferiti";
    }

    if (field === "customer") {
      return "i suoi recapiti";
    }

    return field;
  });
}

function mergeAnalysisWithHeuristic(
  analysis: ReturnType<typeof appointmentIntentToAIAnalysis>,
  heuristic: AppointmentIntent,
): ReturnType<typeof appointmentIntentToAIAnalysis> {
  const requestedStartsAt = analysis.requestedStartsAt ?? heuristic.requestedStartsAt;
  const requestedEndsAt = analysis.requestedEndsAt ?? heuristic.requestedEndsAt;
  const requestedDateTimeText = analysis.requestedDateTimeText ?? heuristic.requestedDateTimeText;
  const hasDates = Boolean(requestedStartsAt && requestedEndsAt);
  const missingFields = (analysis.missingFields ?? []).filter((field) => {
    if (!hasDates) {
      return true;
    }

    return field !== "date/time" && field !== "date" && field !== "time";
  });

  return {
    ...analysis,
    isAppointmentRequest: analysis.isAppointmentRequest || heuristic.isAppointmentRequest,
    requestedStartsAt,
    requestedEndsAt,
    requestedDateTimeText,
    needsMoreInfo: hasDates ? false : analysis.needsMoreInfo,
    missingFields: hasDates ? missingFields : analysis.missingFields,
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}
