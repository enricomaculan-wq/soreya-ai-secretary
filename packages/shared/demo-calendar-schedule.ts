import type { AvailabilitySlot, NormalizedCalendarEvent, SupportedLocale, Uuid } from "./index";
import { resolveLocale } from "./i18n";

/** Grid + scheduling hours shown in the demo playground calendar. */
export const DEMO_SCHEDULE_WORK_HOURS = [9, 10, 11, 12, 14, 15, 16, 17] as const;

const DEMO_SLOT_DURATION_MINUTES = 45;

/** Same occupied windows every work week (Europe/Rome local time), varied by weekday. */
type DemoBusyTitleKey =
  | "checkup"
  | "hygiene"
  | "followUp"
  | "meeting"
  | "consultation"
  | "confirmed"
  | "review"
  | "quote";

type DemoBusyBlock = {
  hour: number;
  minute: number;
  durationMinutes: number;
  titleKey: DemoBusyTitleKey;
};

/**
 * Each workday keeps ~1 h free in the morning and ~1 h in the afternoon,
 * with a different busy pattern per ISO weekday (Mon=1 … Fri=5).
 */
const DEMO_WEEKDAY_BUSY_BLOCKS: Record<1 | 2 | 3 | 4 | 5, DemoBusyBlock[]> = {
  // Mon — free morning 11:00-12:00, free afternoon 16:00-17:00
  1: [
    { hour: 9, minute: 0, durationMinutes: 120, titleKey: "checkup" },
    { hour: 12, minute: 0, durationMinutes: 45, titleKey: "meeting" },
    { hour: 14, minute: 0, durationMinutes: 120, titleKey: "hygiene" },
    { hour: 17, minute: 0, durationMinutes: 30, titleKey: "review" },
  ],
  // Tue — free morning 10:00-11:00, free afternoon 15:00-16:00
  2: [
    { hour: 9, minute: 0, durationMinutes: 60, titleKey: "consultation" },
    { hour: 11, minute: 0, durationMinutes: 105, titleKey: "followUp" },
    { hour: 14, minute: 0, durationMinutes: 60, titleKey: "checkup" },
    { hour: 16, minute: 0, durationMinutes: 105, titleKey: "hygiene" },
  ],
  // Wed — free morning 11:00-12:00, free afternoon 14:00-15:00
  3: [
    { hour: 9, minute: 0, durationMinutes: 120, titleKey: "hygiene" },
    { hour: 12, minute: 0, durationMinutes: 45, titleKey: "review" },
    { hour: 15, minute: 0, durationMinutes: 165, titleKey: "meeting" },
  ],
  // Thu — free morning 10:00-11:00, free afternoon 16:30-17:00; 15:00 busy (demo conflict)
  4: [
    { hour: 9, minute: 0, durationMinutes: 60, titleKey: "checkup" },
    { hour: 11, minute: 0, durationMinutes: 105, titleKey: "consultation" },
    { hour: 14, minute: 0, durationMinutes: 90, titleKey: "confirmed" },
    { hour: 15, minute: 30, durationMinutes: 60, titleKey: "followUp" },
  ],
  // Fri — free morning 09:30-10:30, free afternoon 14:30-15:30
  5: [
    { hour: 9, minute: 0, durationMinutes: 30, titleKey: "quote" },
    { hour: 10, minute: 30, durationMinutes: 135, titleKey: "hygiene" },
    { hour: 14, minute: 0, durationMinutes: 30, titleKey: "meeting" },
    { hour: 15, minute: 30, durationMinutes: 135, titleKey: "checkup" },
  ],
};

function buildDemoSlotCandidates() {
  const candidates: { hour: number; minute: number }[] = [];

  for (const hour of DEMO_SCHEDULE_WORK_HOURS) {
    candidates.push({ hour, minute: 0 });
    if (hour < 17) {
      candidates.push({ hour, minute: 30 });
    }
  }

  return candidates;
}

const DEMO_SLOT_CANDIDATES = buildDemoSlotCandidates();

const SCHEDULE_COPY = {
  it: {
    checkup: "Controllo paziente",
    hygiene: "Igiene dentale",
    followUp: "Controllo post-trattamento",
    meeting: "Riunione di studio",
    consultation: "Prima visita",
    confirmed: "Appuntamento confermato",
    review: "Revisione casi",
    quote: "Preventivo in studio",
    location: "Via Roma 12, Milano",
  },
  en: {
    checkup: "Patient check-up",
    hygiene: "Dental hygiene",
    followUp: "Post-treatment follow-up",
    meeting: "Practice meeting",
    consultation: "First consultation",
    confirmed: "Confirmed appointment",
    review: "Case review",
    quote: "In-office quote",
    location: "Via Roma 12, Milan",
  },
} as const;

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60_000);
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function atLocal(day: string, hour: number, minute: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, hour, minute, 0, 0);
}

function atLocalOnDay(day: Date, hour: number, minute: number) {
  return atLocal(dateKey(day), hour, minute);
}

export function getIsoWeekday(day: Date) {
  const weekday = day.getDay();
  return weekday === 0 ? 7 : weekday;
}

export function isDemoWorkday(day: Date) {
  const weekday = day.getDay();
  return weekday !== 0 && weekday !== 6;
}

export function getNextDemoWorkdays(count: number, reference = new Date()) {
  const days: Date[] = [];
  const cursor = new Date(reference);
  cursor.setHours(12, 0, 0, 0);

  while (days.length < count) {
    if (isDemoWorkday(cursor)) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

function getBusyBlocksForDay(day: Date): DemoBusyBlock[] {
  const isoWeekday = getIsoWeekday(day);
  if (isoWeekday < 1 || isoWeekday > 5) {
    return [];
  }

  return DEMO_WEEKDAY_BUSY_BLOCKS[isoWeekday as 1 | 2 | 3 | 4 | 5];
}

function getBusyIntervalsForDay(day: Date): BusyInterval[] {
  return getBusyBlocksForDay(day).map((block) => {
    const startsAt = atLocalOnDay(day, block.hour, block.minute);
    return {
      startsAt,
      endsAt: addMinutes(startsAt, block.durationMinutes),
    };
  });
}

function intervalsOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function isDemoSlotBusy(
  day: Date,
  hour: number,
  minute: number,
  durationMinutes = DEMO_SLOT_DURATION_MINUTES,
) {
  const startsAt = atLocalOnDay(day, hour, minute);
  const endsAt = addMinutes(startsAt, durationMinutes);
  return getBusyIntervalsForDay(day).some((busy) =>
    intervalsOverlap(startsAt, endsAt, busy.startsAt, busy.endsAt),
  );
}

export function findDemoFreeSlots(
  targetDay: Date,
  options: {
    durationMinutes?: number;
    maxSlots?: number;
    preferMorning?: boolean;
    preferAfternoon?: boolean;
  } = {},
) {
  const durationMinutes = options.durationMinutes ?? DEMO_SLOT_DURATION_MINUTES;
  const maxSlots = options.maxSlots ?? 2;
  const busy = getBusyIntervalsForDay(targetDay);

  const candidates = DEMO_SLOT_CANDIDATES.filter((candidate) => {
    if (options.preferMorning && candidate.hour >= 13) {
      return false;
    }

    if (options.preferAfternoon && candidate.hour < 14) {
      return false;
    }

    const startsAt = atLocalOnDay(targetDay, candidate.hour, candidate.minute);
    const endsAt = addMinutes(startsAt, durationMinutes);
    return !busy.some((interval) => intervalsOverlap(startsAt, endsAt, interval.startsAt, interval.endsAt));
  });

  return candidates.slice(0, maxSlots).map((candidate) => {
    const startsAt = atLocalOnDay(targetDay, candidate.hour, candidate.minute);
    return {
      startsAt: startsAt.toISOString(),
      endsAt: addMinutes(startsAt, durationMinutes).toISOString(),
      durationMinutes,
      provider: "google" as const,
      calendarAccountId: null,
    } satisfies AvailabilitySlot;
  });
}

function titleForBlock(block: DemoBusyBlock, locale: SupportedLocale) {
  const copy = SCHEDULE_COPY[locale];
  return copy[block.titleKey];
}

export function buildDemoScheduleCalendarEvents(input: {
  locale: SupportedLocale | string;
  referenceDate?: Date;
  organizationId: Uuid;
  calendarAccountId: Uuid;
  workdayCount?: number;
}): NormalizedCalendarEvent[] {
  const locale = resolveLocale(input.locale);
  const referenceDate = input.referenceDate ?? new Date();
  const copy = SCHEDULE_COPY[locale];
  const now = referenceDate.toISOString();
  const workdays = getNextDemoWorkdays(input.workdayCount ?? 10, referenceDate);
  const events: NormalizedCalendarEvent[] = [];

  for (const day of workdays) {
    for (const block of getBusyBlocksForDay(day)) {
      const startsAt = atLocalOnDay(day, block.hour, block.minute);
      const endsAt = addMinutes(startsAt, block.durationMinutes);
      events.push({
        id: `demo-schedule-${dateKey(day)}-${block.hour}-${block.minute}` as Uuid,
        organizationId: input.organizationId,
        provider: "google",
        providerEventId: `demo-schedule-${dateKey(day)}-${block.hour}-${block.minute}`,
        calendarAccountId: input.calendarAccountId,
        title: titleForBlock(block, locale),
        description:
          locale === "it"
            ? "Slot occupato fisso nella demo (stesso orario ogni settimana)."
            : "Fixed busy slot in the demo (same time every week).",
        location: copy.location,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezone: "Europe/Rome",
        isAllDay: false,
        attendees: [],
        status: "confirmed",
        raw: { demo: true, demoSchedule: true },
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return events.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

export function describeDemoScheduleFacts(locale: SupportedLocale | string, referenceDate = new Date()) {
  const resolved = resolveLocale(locale);
  const workdays = getNextDemoWorkdays(5, referenceDate);
  const facts: string[] = [];

  for (const day of workdays) {
    const dayLabel = new Intl.DateTimeFormat(resolved === "it" ? "it-IT" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      timeZone: "Europe/Rome",
    }).format(day);
    const busy = getBusyIntervalsForDay(day)
      .map((interval) =>
        new Intl.DateTimeFormat(resolved === "it" ? "it-IT" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Rome",
        }).format(interval.startsAt),
      )
      .join(", ");
    const free = findDemoFreeSlots(day, { maxSlots: 4 })
      .map((slot) =>
        new Intl.DateTimeFormat(resolved === "it" ? "it-IT" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Rome",
        }).format(new Date(slot.startsAt)),
      )
      .join(", ");

    facts.push(
      resolved === "it"
        ? `${dayLabel}: occupato ${busy || "—"}; libero ${free || "—"}.`
        : `${dayLabel}: busy ${busy || "—"}; free ${free || "—"}.`,
    );
  }

  return facts;
}

export function resolveDemoTargetDayFromText(text: string, referenceDate = new Date()) {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const tomorrow = addDays(referenceDate, 1);
  const dayAfterTomorrow = addDays(referenceDate, 2);

  if (/\b(dopodomani|day after tomorrow)\b/.test(normalized)) {
    return dayAfterTomorrow;
  }

  if (/\b(giovedi|thursday)\b/.test(normalized)) {
    return nextWeekday(referenceDate, 4);
  }

  if (/\b(venerdi|friday)\b/.test(normalized)) {
    return nextWeekday(referenceDate, 5);
  }

  if (/\b(domani|tomorrow)\b/.test(normalized)) {
    return tomorrow;
  }

  if (/\b(oggi|today)\b/.test(normalized)) {
    return referenceDate;
  }

  return tomorrow;
}

function nextWeekday(reference: Date, isoWeekday: number) {
  const cursor = new Date(reference);
  cursor.setHours(12, 0, 0, 0);

  for (let index = 0; index < 14; index += 1) {
    if (getIsoWeekday(cursor) === isoWeekday) {
      return new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return addDays(reference, 1);
}
