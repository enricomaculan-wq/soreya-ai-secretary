import type { Json } from "@soreya/shared";

export type ParsedCalendarEventDraft = {
  provider: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  description: string | null;
  customerName: string | null;
  customerEmail: string | null;
  calendarEventId: string | null;
};

export function parseCalendarEventDraft(draft: Record<string, Json | undefined>): ParsedCalendarEventDraft | null {
  const nested = toRecord(draft.payload);
  const source = Object.keys(nested).length > 0 ? { ...draft, ...nested } : draft;
  const startsAt = readString(source, "startsAt") ?? readString(source, "requestedStartsAt");
  const endsAt = readString(source, "endsAt") ?? readString(source, "requestedEndsAt");
  const title = readString(source, "title") ?? readString(source, "summary");

  if (!startsAt || !endsAt || !title) {
    return null;
  }

  return {
    provider: readString(source, "provider"),
    title,
    startsAt,
    endsAt,
    timezone: readString(source, "timezone") ?? "Europe/Rome",
    description: readString(source, "description") ?? readString(source, "reason"),
    customerName: readString(source, "customerName") ?? readString(source, "fromName"),
    customerEmail: readString(source, "customerEmail") ?? readString(source, "recipient"),
    calendarEventId: readString(source, "calendarEventId") ?? readString(source, "eventId"),
  };
}

export function buildEmailCalendarEventTitle(input: {
  customerName?: string | null;
  serviceName?: string | null;
  subject?: string | null;
}): string {
  const service = input.serviceName?.trim();
  const customer = input.customerName?.trim();

  if (service && customer) {
    return `${service} - ${customer}`;
  }

  if (customer) {
    return `Appuntamento - ${customer}`;
  }

  if (service) {
    return service;
  }

  return input.subject?.trim() || "Appuntamento";
}

export function buildEmailCalendarEventDescription(input: {
  customerName?: string | null;
  customerEmail?: string | null;
  subject?: string | null;
  messageSnippet?: string | null;
}): string {
  const lines = [
    input.customerName ? `Paziente: ${input.customerName}` : null,
    input.customerEmail ? `Email: ${input.customerEmail}` : null,
    input.subject ? `Oggetto: ${input.subject}` : null,
    input.messageSnippet ? `Nota: ${input.messageSnippet}` : null,
    "Creato da Soreya dopo approvazione esplicita.",
  ].filter(Boolean);

  return lines.join("\n");
}

function toRecord(value: unknown): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Json | undefined>) : {};
}

function readString(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
