import type {
  AvailabilitySlot,
  CalendarAttendee,
  CalendarAvailabilityRules,
  CalendarConflict,
  CalendarEventStatus,
  ConnectedCalendarAccount,
  Json,
  NormalizedCalendarEvent,
  UserRule,
} from "@soreya/shared";

export type CalendarEngineRules = CalendarAvailabilityRules & {
  userRules?: UserRule[];
};

type RawEvent = Record<string, unknown>;

const DEFAULT_DURATION_MINUTES = 30;
const DEFAULT_BUFFER_MINUTES = 10;
const SLOT_INCREMENT_MINUTES = 15;
const MAX_ALTERNATIVES = 3;

const DEFAULT_WORKING_HOURS = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
];

export function normalizeGoogleCalendarEvent(
  rawEvent: RawEvent,
  account: ConnectedCalendarAccount,
): NormalizedCalendarEvent {
  const start = readGoogleDate(rawEvent.start);
  const end = readGoogleDate(rawEvent.end);
  const providerEventId = readString(rawEvent.id) || readString(rawEvent.iCalUID) || "unknown-google-event";
  const now = new Date().toISOString();

  return {
    id: providerEventId,
    organizationId: account.organizationId,
    provider: "google",
    providerEventId,
    calendarAccountId: account.id,
    title: readString(rawEvent.summary) || "Untitled event",
    description: readString(rawEvent.description),
    location: readString(rawEvent.location),
    startsAt: start.dateTime,
    endsAt: end.dateTime,
    timezone: start.timezone ?? end.timezone,
    isAllDay: start.isAllDay || end.isAllDay,
    attendees: normalizeGoogleAttendees(rawEvent.attendees),
    status: normalizeStatus(readString(rawEvent.status)),
    raw: rawEvent as Json,
    createdAt: readString(rawEvent.created) || now,
    updatedAt: readString(rawEvent.updated) || now,
  };
}

export function normalizeMicrosoftCalendarEvent(
  rawEvent: RawEvent,
  account: ConnectedCalendarAccount,
): NormalizedCalendarEvent {
  const start = readMicrosoftDate(rawEvent.start);
  const end = readMicrosoftDate(rawEvent.end);
  const providerEventId = readString(rawEvent.id) || "unknown-microsoft-event";
  const now = new Date().toISOString();

  return {
    id: providerEventId,
    organizationId: account.organizationId,
    provider: "microsoft",
    providerEventId,
    calendarAccountId: account.id,
    title: readString(rawEvent.subject) || "Untitled event",
    description: readString(rawEvent.bodyPreview),
    location: readMicrosoftLocation(rawEvent.location),
    startsAt: start.dateTime,
    endsAt: end.dateTime,
    timezone: start.timezone ?? end.timezone,
    isAllDay: Boolean(rawEvent.isAllDay),
    attendees: normalizeMicrosoftAttendees(rawEvent.attendees),
    status: normalizeMicrosoftStatus(readString(rawEvent.showAs), Boolean(rawEvent.isCancelled)),
    raw: rawEvent as Json,
    createdAt: readString(rawEvent.createdDateTime) || now,
    updatedAt: readString(rawEvent.lastModifiedDateTime) || now,
  };
}

export function detectCalendarConflicts(
  events: NormalizedCalendarEvent[],
  requestedStart: string,
  requestedEnd: string,
): NormalizedCalendarEvent[] {
  const requestedStartMs = new Date(requestedStart).getTime();
  const requestedEndMs = new Date(requestedEnd).getTime();

  return events
    .filter((event) => event.status !== "cancelled")
    .filter((event) => overlaps(requestedStartMs, requestedEndMs, event.startsAt, event.endsAt));
}

export function findAvailableSlots(
  events: NormalizedCalendarEvent[],
  rules: CalendarEngineRules,
  rangeStart: string,
  rangeEnd: string,
): AvailabilitySlot[] {
  const durationMinutes = resolveDurationMinutes(rules);
  const bufferMinutes = resolveBufferMinutes(rules);
  const workingHours = rules.workingHours?.length ? rules.workingHours : DEFAULT_WORKING_HOURS;
  const now = Date.now();
  const rangeStartMs = Math.max(new Date(rangeStart).getTime(), now);
  const rangeEndMs = new Date(rangeEnd).getTime();
  const slots: AvailabilitySlot[] = [];

  for (const day = startOfDay(rangeStartMs); day.getTime() < rangeEndMs; day.setUTCDate(day.getUTCDate() + 1)) {
    const dayOfWeek = day.getUTCDay();
    const hoursForDay = workingHours.filter((hours) => hours.dayOfWeek === dayOfWeek);

    for (const hours of hoursForDay) {
      const workStart = Math.max(applyTimeToDay(day, hours.startTime).getTime(), rangeStartMs);
      const workEnd = Math.min(applyTimeToDay(day, hours.endTime).getTime(), rangeEndMs);

      for (
        let candidateStart = roundUpToIncrement(workStart, SLOT_INCREMENT_MINUTES);
        candidateStart + minutes(durationMinutes) <= workEnd;
        candidateStart += minutes(SLOT_INCREMENT_MINUTES)
      ) {
        const candidateEnd = candidateStart + minutes(durationMinutes);
        const blocked = events
          .filter((event) => event.status !== "cancelled")
          .some((event) =>
            overlaps(
              candidateStart - minutes(bufferMinutes),
              candidateEnd + minutes(bufferMinutes),
              event.startsAt,
              event.endsAt,
            ),
          );

        if (!blocked) {
          slots.push({
            startsAt: new Date(candidateStart).toISOString(),
            endsAt: new Date(candidateEnd).toISOString(),
            durationMinutes,
            provider: "all",
            calendarAccountId: null,
          });
        }
      }
    }
  }

  return slots;
}

export function suggestAlternativeSlots(
  events: NormalizedCalendarEvent[],
  rules: CalendarEngineRules,
  requestedStart: string,
  requestedEnd: string,
): AvailabilitySlot[] {
  const requestedStartDate = new Date(requestedStart);
  const requestedEndDate = new Date(requestedEnd);
  const requestedDuration = Math.max(
    DEFAULT_DURATION_MINUTES,
    Math.round((requestedEndDate.getTime() - requestedStartDate.getTime()) / minutes(1)),
  );
  const rangeStart = new Date(Math.max(requestedStartDate.getTime(), Date.now())).toISOString();
  const rangeEnd = new Date(requestedStartDate.getTime() + minutes(60 * 24 * 7)).toISOString();

  return findAvailableSlots(
    events,
    {
      ...rules,
      durationMinutes: rules.durationMinutes ?? requestedDuration,
    },
    rangeStart,
    rangeEnd,
  ).slice(0, MAX_ALTERNATIVES);
}

export function buildCalendarConflict(
  events: NormalizedCalendarEvent[],
  rules: CalendarEngineRules,
  requestedStart: string,
  requestedEnd: string,
): CalendarConflict {
  const conflictingEvents = detectCalendarConflicts(events, requestedStart, requestedEnd);
  const requiredMinutes = rules.durationMinutes ?? Math.max(
    DEFAULT_DURATION_MINUTES,
    Math.round((new Date(requestedEnd).getTime() - new Date(requestedStart).getTime()) / minutes(1)),
  );
  const alternatives = conflictingEvents.length
    ? suggestAlternativeSlots(events, rules, requestedStart, requestedEnd)
    : [];

  return {
    requestedStartsAt: requestedStart,
    requestedEndsAt: requestedEnd,
    conflictingEvents,
    alternatives: filterAvailabilitySlotsByRequiredDuration(alternatives, requiredMinutes),
  };
}

export function filterAvailabilitySlotsByRequiredDuration(
  slots: AvailabilitySlot[],
  requiredMinutes: number,
): AvailabilitySlot[] {
  if (requiredMinutes <= 0) {
    return slots;
  }

  return slots.filter((slot) => slot.durationMinutes >= requiredMinutes);
}

function normalizeGoogleAttendees(value: unknown): CalendarAttendee[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((attendee) => {
    const record = toRecord(attendee);

    return {
      email: readString(record.email),
      displayName: readString(record.displayName),
      responseStatus: readString(record.responseStatus),
      optional: Boolean(record.optional),
    };
  });
}

function normalizeMicrosoftAttendees(value: unknown): CalendarAttendee[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((attendee) => {
    const record = toRecord(attendee);
    const emailAddress = toRecord(record.emailAddress);

    return {
      email: readString(emailAddress.address),
      displayName: readString(emailAddress.name),
      responseStatus: readString(toRecord(record.status).response),
      optional: readString(record.type) === "optional",
    };
  });
}

function readGoogleDate(value: unknown): { dateTime: string; timezone: string | null; isAllDay: boolean } {
  const record = toRecord(value);
  const dateTime = readString(record.dateTime);
  const date = readString(record.date);

  if (dateTime) {
    return {
      dateTime: new Date(dateTime).toISOString(),
      timezone: readString(record.timeZone),
      isAllDay: false,
    };
  }

  return {
    dateTime: new Date(`${date ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`).toISOString(),
    timezone: readString(record.timeZone),
    isAllDay: true,
  };
}

function readMicrosoftDate(value: unknown): { dateTime: string; timezone: string | null } {
  const record = toRecord(value);
  const dateTime = readString(record.dateTime);

  return {
    dateTime: new Date(dateTime ?? new Date().toISOString()).toISOString(),
    timezone: readString(record.timeZone),
  };
}

function readMicrosoftLocation(value: unknown): string | null {
  const record = toRecord(value);

  return readString(record.displayName);
}

function normalizeStatus(value: string | null): CalendarEventStatus {
  if (value === "cancelled") {
    return "cancelled";
  }

  if (value === "tentative") {
    return "tentative";
  }

  return "confirmed";
}

function normalizeMicrosoftStatus(showAs: string | null, isCancelled: boolean): CalendarEventStatus {
  if (isCancelled) {
    return "cancelled";
  }

  if (showAs === "tentative") {
    return "tentative";
  }

  return "confirmed";
}

function resolveDurationMinutes(rules: CalendarEngineRules): number {
  const metadataDuration = readNumberFromUserRules(rules.userRules, "durationMinutes");

  return Math.max(5, metadataDuration ?? rules.durationMinutes ?? DEFAULT_DURATION_MINUTES);
}

function resolveBufferMinutes(rules: CalendarEngineRules): number {
  const metadataBuffer = readNumberFromUserRules(rules.userRules, "bufferMinutes");

  return Math.max(0, metadataBuffer ?? rules.bufferMinutes ?? DEFAULT_BUFFER_MINUTES);
}

function readNumberFromUserRules(userRules: UserRule[] | undefined, key: string): number | null {
  if (!userRules) {
    return null;
  }

  for (const rule of userRules) {
    const metadata = toRecord(rule.metadata);
    const value = metadata[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function overlaps(startMs: number, endMs: number, eventStart: string, eventEnd: string): boolean {
  const eventStartMs = new Date(eventStart).getTime();
  const eventEndMs = new Date(eventEnd).getTime();

  return startMs < eventEndMs && endMs > eventStartMs;
}

function startOfDay(timestamp: number): Date {
  const day = new Date(timestamp);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

function applyTimeToDay(day: Date, time: string): Date {
  const [hours, minutesValue] = time.split(":").map(Number);
  const date = new Date(day);
  date.setUTCHours(hours || 0, minutesValue || 0, 0, 0);
  return date;
}

function roundUpToIncrement(timestamp: number, incrementMinutes: number): number {
  const increment = minutes(incrementMinutes);
  return Math.ceil(timestamp / increment) * increment;
}

function minutes(value: number): number {
  return value * 60 * 1000;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(value: unknown): RawEvent {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawEvent) : {};
}
