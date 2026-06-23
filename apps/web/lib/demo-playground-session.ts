"use client";

import {
  extractDemoConfirmedTimeHint,
  getSoreyaDemoData,
  isDemoPatientConfirmationText,
  resolveDemoPatientFirstName,
  type DemoCustomerRequestAnalysis,
  type Json,
  type NormalizedCalendarEvent,
  type SupportedLocale,
  type Uuid,
} from "@soreya/shared";
import { useCallback, useSyncExternalStore } from "react";

export type DemoChatRole = "customer" | "studio";

export type DemoChatMessage = {
  id: string;
  role: DemoChatRole;
  body: string;
  status: "sent" | "draft";
  createdAt: string;
};

export type DemoPlaygroundSession = {
  messages: DemoChatMessage[];
  calendarEvents: NormalizedCalendarEvent[];
  pendingConfirmationEventIds: string[];
  highlightedEventIds: string[];
};

const SESSION_EVENT = "soreya-demo-playground-session-change";
const sessionCache: Partial<Record<SupportedLocale, DemoPlaygroundSession>> = {};
const serverSnapshotCache: Partial<Record<SupportedLocale, DemoPlaygroundSession>> = {};

function getServerSnapshot(locale: SupportedLocale): DemoPlaygroundSession {
  if (!serverSnapshotCache[locale]) {
    serverSnapshotCache[locale] = seedSession(locale);
  }

  return serverSnapshotCache[locale]!;
}

function storageKey(locale: SupportedLocale) {
  return `soreya-demo-playground-session.${locale}`;
}

function seedSession(locale: SupportedLocale): DemoPlaygroundSession {
  return {
    messages: [],
    calendarEvents: getSoreyaDemoData(locale).calendarEvents,
    highlightedEventIds: [],
    pendingConfirmationEventIds: [],
  };
}

function readSession(locale: SupportedLocale): DemoPlaygroundSession {
  if (sessionCache[locale]) {
    return sessionCache[locale]!;
  }

  if (typeof window === "undefined") {
    return getServerSnapshot(locale);
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey(locale));
    if (!raw) {
      const seeded = seedSession(locale);
      sessionCache[locale] = seeded;
      return seeded;
    }

    const parsed = JSON.parse(raw) as DemoPlaygroundSession;
    sessionCache[locale] = {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : seedSession(locale).calendarEvents,
      pendingConfirmationEventIds: Array.isArray(parsed.pendingConfirmationEventIds)
        ? parsed.pendingConfirmationEventIds
        : [],
      highlightedEventIds: Array.isArray(parsed.highlightedEventIds) ? parsed.highlightedEventIds : [],
    };
    return sessionCache[locale]!;
  } catch {
    const seeded = seedSession(locale);
    sessionCache[locale] = seeded;
    return seeded;
  }
}

function writeSession(locale: SupportedLocale, session: DemoPlaygroundSession) {
  sessionCache[locale] = session;

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey(locale), JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { locale } }));
  }
}

export function useDemoPlaygroundSession(locale: SupportedLocale) {
  const session = useSyncExternalStore(
    useCallback((onStoreChange) => {
      function onChange(event: Event) {
        const detail = (event as CustomEvent<{ locale: SupportedLocale }>).detail;
        if (!detail || detail.locale === locale) {
          onStoreChange();
        }
      }

      window.addEventListener(SESSION_EVENT, onChange as EventListener);
      return () => window.removeEventListener(SESSION_EVENT, onChange as EventListener);
    }, [locale]),
    useCallback(() => readSession(locale), [locale]),
    useCallback(() => getServerSnapshot(locale), [locale]),
  );

  const updateSession = useCallback(
    (updater: (current: DemoPlaygroundSession) => DemoPlaygroundSession) => {
      const next = updater(readSession(locale));
      writeSession(locale, next);
    },
    [locale],
  );

  const appendCustomerMessage = useCallback(
    (body: string) => {
      const message: DemoChatMessage = {
        id: `customer-${Date.now()}`,
        role: "customer",
        body,
        status: "sent",
        createdAt: new Date().toISOString(),
      };

      updateSession((current) => ({
        ...current,
        messages: [...current.messages.filter((item) => item.status !== "draft"), message],
      }));

      return message.id;
    },
    [updateSession],
  );

  const setDraftReply = useCallback(
    (body: string) => {
      const draft: DemoChatMessage = {
        id: `studio-draft-${Date.now()}`,
        role: "studio",
        body,
        status: "draft",
        createdAt: new Date().toISOString(),
      };

      updateSession((current) => ({
        ...current,
        messages: [...current.messages.filter((item) => item.status !== "draft"), draft],
      }));
    },
    [updateSession],
  );

  const holdProposalSlots = useCallback(
    (analysis: DemoCustomerRequestAnalysis, patientName: string | null) => {
      updateSession((current) => applyProposalSlotsToSession(current, analysis, patientName, locale));
    },
    [locale, updateSession],
  );

  const clearProposalSlots = useCallback(() => {
    updateSession((current) => removePlaygroundTentativeProposalsFromSession(current));
  }, [updateSession]);

  const approveDraft = useCallback(
    (analysis: DemoCustomerRequestAnalysis, replyBody: string, patientName: string | null) => {
      const proposedEvents = buildCalendarEventsFromAnalysis(analysis, patientName, locale);

      updateSession((current) => {
        const messages = current.messages.some((message) => message.status === "draft")
          ? current.messages.map((message) =>
              message.status === "draft"
                ? { ...message, body: replyBody, status: "sent" as const }
                : message,
            )
          : [
              ...current.messages,
              {
                id: `studio-${Date.now()}`,
                role: "studio" as const,
                body: replyBody,
                status: "sent" as const,
                createdAt: new Date().toISOString(),
              },
            ];

        const pendingGroup = findLatestPendingProposalGroup(current.calendarEvents);
        const lastCustomerBody =
          [...current.messages].reverse().find((message) => message.role === "customer" && message.status === "sent")
            ?.body ?? analysis.customerText;
        const lastStudioReply =
          [...messages].reverse().find((message) => message.role === "studio" && message.status === "sent")?.body ??
          replyBody;
        const isConfirmation =
          isDemoPatientConfirmationText(lastCustomerBody) &&
          pendingGroup.length > 0 &&
          (pendingGroup.length === 1 ||
            Boolean(extractDemoConfirmedTimeHint(lastCustomerBody, lastStudioReply)));

        let nextEvents = current.calendarEvents;
        let nextPendingIds = [...current.pendingConfirmationEventIds];
        let nextHighlightedIds = [...current.highlightedEventIds];

        if (isConfirmation && pendingGroup.length > 0) {
          const confirmedEvent = resolveConfirmedPendingEvent(
            pendingGroup,
            lastCustomerBody,
            lastStudioReply,
          );
          if (confirmedEvent) {
          const releasedIds = new Set(
            pendingGroup.filter((event) => event.id !== confirmedEvent.id).map((event) => event.id),
          );

          nextEvents = current.calendarEvents
            .filter((event) => !releasedIds.has(event.id))
            .map((event) =>
              event.id === confirmedEvent.id ? confirmPlaygroundCalendarEvent(event, locale) : event,
            );
          nextPendingIds = nextPendingIds.filter((id) => !pendingGroup.some((event) => event.id === id));
          nextHighlightedIds = [confirmedEvent.id, ...nextHighlightedIds.filter((id) => id !== confirmedEvent.id)];
          }
        } else if (proposedEvents.length > 0) {
          const existingPending = current.calendarEvents.filter(isDemoPlaygroundPendingEvent);

          if (!haveSameProposalSlots(existingPending, proposedEvents)) {
            const removedPendingIds = new Set(existingPending.map((event) => event.id));
            const withoutOldProposals = current.calendarEvents.filter(
              (event) => !isDemoPlaygroundPendingEvent(event),
            );
            nextEvents = [...withoutOldProposals, ...proposedEvents].sort(
              (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
            );
            nextPendingIds = [
              ...proposedEvents.map((event) => event.id),
              ...nextPendingIds.filter((id) => !removedPendingIds.has(id)),
            ];
          }
        }

        return {
          messages,
          calendarEvents: nextEvents,
          pendingConfirmationEventIds: nextPendingIds,
          highlightedEventIds: nextHighlightedIds,
        };
      });
    },
    [locale, updateSession],
  );

  const removeDraft = useCallback(() => {
    updateSession((current) => ({
      ...current,
      messages: current.messages.filter((message) => message.status !== "draft"),
    }));
  }, [updateSession]);

  const resetSession = useCallback(() => {
    writeSession(locale, seedSession(locale));
  }, [locale]);

  return {
    session,
    appendCustomerMessage,
    setDraftReply,
    holdProposalSlots,
    clearProposalSlots,
    approveDraft,
    removeDraft,
    resetSession,
  };
}

export function buildConversationHistory(messages: DemoChatMessage[]) {
  return messages
    .filter((message) => message.status === "sent")
    .map((message) => ({
      role: message.role,
      body: message.body,
    }));
}

export function buildCalendarEventsFromAnalysis(
  analysis: DemoCustomerRequestAnalysis,
  patientName: string | null,
  locale: SupportedLocale,
): NormalizedCalendarEvent[] {
  if (analysis.detectedIntent !== "new_appointment" && analysis.detectedIntent !== "reschedule_appointment") {
    return [];
  }

  const slots = resolveProposalSlotsForCalendar(analysis);
  if (slots.length === 0) {
    return [];
  }

  const demo = getSoreyaDemoData(locale);
  const firstName = resolveDemoPatientFirstName(patientName, analysis.senderName, analysis.customerName);
  const serviceLabel = analysis.reason || (locale === "it" ? "Appuntamento" : "Appointment");
  const now = new Date().toISOString();
  const proposalId = `demo-proposal-${Date.now()}`;

  return slots.map((slot, index) => {
    const durationMinutes = slot.durationMinutes > 0 ? slot.durationMinutes : 30;
    const startsAt = slot.startsAt;
    const endsAt =
      slot.endsAt || new Date(new Date(startsAt).getTime() + durationMinutes * 60_000).toISOString();

    return {
      id: `${proposalId}-${index}` as Uuid,
      organizationId: demo.organization.id,
      provider: "google",
      providerEventId: `${proposalId}-${index}`,
      calendarAccountId: demo.calendarEvents[0]?.calendarAccountId ?? demo.organization.id,
      title: firstName ? `${serviceLabel} · ${firstName}` : serviceLabel,
      description:
        locale === "it"
          ? "Proposta inviata al paziente: in attesa della sua conferma."
          : "Proposal sent to the patient: waiting for their confirmation.",
      location: demo.calendarEvents[0]?.location ?? null,
      startsAt,
      endsAt,
      timezone: "Europe/Rome",
      isAllDay: false,
      attendees: firstName
        ? [{ email: null, displayName: firstName, responseStatus: "needsAction" }]
        : [],
      status: "tentative",
      raw: {
        demo: true,
        demoPlaygroundAdded: true,
        demoPlaygroundPendingConfirmation: true,
        demoPlaygroundProposalId: proposalId,
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function buildCalendarEventFromAnalysis(
  analysis: DemoCustomerRequestAnalysis,
  patientName: string | null,
  locale: SupportedLocale,
): NormalizedCalendarEvent | null {
  return buildCalendarEventsFromAnalysis(analysis, patientName, locale)[0] ?? null;
}

function resolveProposalSlotsForCalendar(analysis: DemoCustomerRequestAnalysis) {
  return dedupeAlternativesByStart(analysis.alternatives).slice(0, 2);
}

function applyProposalSlotsToSession(
  current: DemoPlaygroundSession,
  analysis: DemoCustomerRequestAnalysis,
  patientName: string | null,
  locale: SupportedLocale,
): DemoPlaygroundSession {
  const proposedEvents = buildCalendarEventsFromAnalysis(analysis, patientName, locale);
  if (proposedEvents.length === 0) {
    return current;
  }

  const existingPending = current.calendarEvents.filter(isDemoPlaygroundPendingEvent);
  if (haveSameProposalSlots(existingPending, proposedEvents)) {
    return current;
  }

  const withoutOldProposals = current.calendarEvents.filter((event) => !isDemoPlaygroundPendingEvent(event));
  const removedPendingIds = new Set(
    current.calendarEvents.filter(isDemoPlaygroundPendingEvent).map((event) => event.id),
  );
  const nextEvents = [...withoutOldProposals, ...proposedEvents].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );

  return {
    ...current,
    calendarEvents: nextEvents,
    pendingConfirmationEventIds: [
      ...proposedEvents.map((event) => event.id),
      ...current.pendingConfirmationEventIds.filter((id) => !removedPendingIds.has(id)),
    ],
  };
}

function removePlaygroundTentativeProposalsFromSession(current: DemoPlaygroundSession): DemoPlaygroundSession {
  const releasedIds = new Set(
    current.calendarEvents.filter(isDemoPlaygroundPendingEvent).map((event) => event.id),
  );

  return {
    ...current,
    calendarEvents: current.calendarEvents.filter((event) => !releasedIds.has(event.id)),
    pendingConfirmationEventIds: current.pendingConfirmationEventIds.filter((id) => !releasedIds.has(id)),
  };
}

function dedupeAlternativesByStart<T extends { startsAt: string }>(alternatives: T[]) {
  const seen = new Set<string>();

  return alternatives.filter((alternative) => {
    if (!alternative.startsAt || seen.has(alternative.startsAt)) {
      return false;
    }

    seen.add(alternative.startsAt);
    return true;
  });
}

function haveSameProposalSlots(
  existingEvents: NormalizedCalendarEvent[],
  proposedEvents: NormalizedCalendarEvent[],
) {
  if (existingEvents.length !== proposedEvents.length) {
    return false;
  }

  const existingStartsAt = existingEvents.map((event) => event.startsAt).sort();
  const proposedStartsAt = proposedEvents.map((event) => event.startsAt).sort();

  return existingStartsAt.every((startsAt, index) => startsAt === proposedStartsAt[index]);
}

function isDemoPlaygroundPendingEvent(event: NormalizedCalendarEvent) {
  const raw = event.raw as Json | null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }

  return Boolean((raw as Record<string, unknown>).demoPlaygroundPendingConfirmation) && event.status === "tentative";
}

function getDemoPlaygroundProposalId(event: NormalizedCalendarEvent) {
  const raw = event.raw as Json | null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const proposalId = (raw as Record<string, unknown>).demoPlaygroundProposalId;
  return typeof proposalId === "string" ? proposalId : null;
}

function findLatestPendingProposalGroup(events: NormalizedCalendarEvent[]) {
  const pending = events.filter(isDemoPlaygroundPendingEvent);
  if (pending.length === 0) {
    return [];
  }

  const groups = new Map<string, NormalizedCalendarEvent[]>();

  for (const event of pending) {
    const proposalId = getDemoPlaygroundProposalId(event) ?? event.id;
    groups.set(proposalId, [...(groups.get(proposalId) ?? []), event]);
  }

  let latestGroup: NormalizedCalendarEvent[] = [];

  for (const group of groups.values()) {
    const latestCreatedAt = Math.max(...group.map((event) => new Date(event.createdAt).getTime()));
    const currentLatestCreatedAt =
      latestGroup.length > 0
        ? Math.max(...latestGroup.map((event) => new Date(event.createdAt).getTime()))
        : 0;

    if (latestCreatedAt >= currentLatestCreatedAt) {
      latestGroup = group;
    }
  }

  return latestGroup.sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}

function resolveConfirmedPendingEvent(
  pendingEvents: NormalizedCalendarEvent[],
  customerBody: string,
  studioReply: string,
) {
  const timeHint = extractDemoConfirmedTimeHint(customerBody, studioReply);

  if (!timeHint && pendingEvents.length > 1) {
    return null;
  }

  if (timeHint) {
    const parts = timeHint.replace(".", ":").split(":");
    const hours = Number(parts[0]);
    const minutes = parts.length > 1 && parts[1] !== "" ? Number(parts[1]) : 0;
    const matched = pendingEvents.find((event) => {
      const startsAt = new Date(event.startsAt);
      return startsAt.getHours() === hours && startsAt.getMinutes() === minutes;
    });

    if (matched) {
      return matched;
    }
  }

  return pendingEvents[0];
}

function confirmPlaygroundCalendarEvent(
  event: NormalizedCalendarEvent,
  locale: SupportedLocale,
): NormalizedCalendarEvent {
  const now = new Date().toISOString();
  const raw =
    typeof event.raw === "object" && event.raw !== null && !Array.isArray(event.raw)
      ? (event.raw as Record<string, unknown>)
      : {};

  return {
    ...event,
    status: "confirmed",
    attendees: event.attendees.map((attendee) => ({
      ...attendee,
      responseStatus: attendee.responseStatus === "needsAction" ? "accepted" : attendee.responseStatus,
    })),
    description:
      locale === "it"
        ? "Confermato dal paziente nella demo dopo approvazione della risposta."
        : "Confirmed by the patient in the demo after approving the reply.",
    raw: {
      ...raw,
      demoPlaygroundPendingConfirmation: false,
      demoPlaygroundConfirmed: true,
    },
    updatedAt: now,
  };
}
