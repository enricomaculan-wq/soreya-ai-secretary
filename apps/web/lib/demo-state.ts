"use client";

import {
  getDictionary,
  getSoreyaDemoData,
  resolveLocale,
  t as translate,
  type EmergencyActionType,
  type EmergencyMessageTone,
  type EmergencyModeResult,
  type EmergencyTargetWindow,
  type Json,
  type QuickCallNote,
  type QuickCallResult,
  type RescheduleProposal,
  type SuggestedAction,
  type SuggestedActionType,
  type SupportedLocale,
} from "@soreya/shared";
import { useCallback, useSyncExternalStore } from "react";

const DEMO_EVENT_NAME = "soreya-demo-state-change";
export const DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY = "soreya-demo-approvals";
const actionCache: Partial<Record<SupportedLocale, SuggestedAction[]>> = {};
const quickCallNoteCache: Partial<Record<SupportedLocale, QuickCallNote[]>> = {};
const fallbackActionSnapshots: Partial<Record<SupportedLocale, SuggestedAction[]>> = {};
const fallbackQuickCallNoteSnapshots: Partial<Record<SupportedLocale, QuickCallNote[]>> = {};

type DemoStateScope = "actions" | "quick-call-notes";

type DemoEmergencyForm = {
  type: EmergencyActionType;
  targetDate: string;
  reason: string;
  delayMinutes: number;
  messageTone: EmergencyMessageTone;
  targetWindow: EmergencyTargetWindow;
  customMessage: string;
};

type SuggestedActionInput = {
  actionType: SuggestedActionType;
  title: string;
  rationale: string | null;
  draftPayload: Json;
  riskLevel: "low" | "normal" | "high" | "critical";
  callNoteId?: string | null;
  emergencyActionId?: string | null;
  rescheduleProposalId?: string | null;
};

export function useDemoSuggestedActions(locale: SupportedLocale) {
  const resolvedLocale = resolveLocale(locale);
  const actions = useSyncExternalStore(
    useCallback((onStoreChange) => subscribeDemoState("actions", resolvedLocale, onStoreChange), [resolvedLocale]),
    useCallback(() => readDemoSuggestedActions(resolvedLocale), [resolvedLocale]),
    useCallback(() => getFallbackSuggestedActions(resolvedLocale), [resolvedLocale]),
  );

  const setActions = useCallback(
    (updater: SuggestedAction[] | ((current: SuggestedAction[]) => SuggestedAction[])) => {
      const current = readDemoSuggestedActions(resolvedLocale);
      const next = typeof updater === "function" ? updater(current) : updater;
      writeDemoSuggestedActions(resolvedLocale, next);
      emitDemoStateChange("actions", resolvedLocale);
    },
    [resolvedLocale],
  );

  return [actions, setActions] as const;
}

export function useDemoQuickCallNotes(locale: SupportedLocale) {
  const resolvedLocale = resolveLocale(locale);
  const notes = useSyncExternalStore(
    useCallback((onStoreChange) => subscribeDemoState("quick-call-notes", resolvedLocale, onStoreChange), [resolvedLocale]),
    useCallback(() => readDemoQuickCallNotes(resolvedLocale), [resolvedLocale]),
    useCallback(() => getFallbackQuickCallNotes(resolvedLocale), [resolvedLocale]),
  );

  const setNotes = useCallback(
    (updater: QuickCallNote[] | ((current: QuickCallNote[]) => QuickCallNote[])) => {
      const current = readDemoQuickCallNotes(resolvedLocale);
      const next = typeof updater === "function" ? updater(current) : updater;
      writeDemoQuickCallNotes(resolvedLocale, next);
      emitDemoStateChange("quick-call-notes", resolvedLocale);
    },
    [resolvedLocale],
  );

  return [notes, setNotes] as const;
}

export function readDemoSuggestedActions(locale: SupportedLocale): SuggestedAction[] {
  const resolvedLocale = resolveLocale(locale);
  const cached = actionCache[resolvedLocale];

  if (cached) {
    return cached;
  }

  const stored = readJson<SuggestedAction[]>(storageKey("actions", resolvedLocale));

  if (Array.isArray(stored)) {
    const merged = mergeDemoPlaygroundApprovals(stored, resolvedLocale);
    actionCache[resolvedLocale] = merged;
    return merged;
  }

  const actions = mergeDemoPlaygroundApprovals(getSoreyaDemoData(resolvedLocale).suggestedActions, resolvedLocale);
  writeDemoSuggestedActions(resolvedLocale, actions);
  return actions;
}

export function addDemoSuggestedActions(locale: SupportedLocale, actions: SuggestedAction[]) {
  const resolvedLocale = resolveLocale(locale);
  const actionIds = new Set(actions.map((action) => action.id));
  const next = [
    ...actions,
    ...readDemoSuggestedActions(resolvedLocale).filter((action) => !actionIds.has(action.id)),
  ];

  writeDemoSuggestedActions(resolvedLocale, next);
  emitDemoStateChange("actions", resolvedLocale);
  return next;
}

export function buildDemoQuickCallResult(locale: SupportedLocale, rawText: string): QuickCallResult {
  const resolvedLocale = resolveLocale(locale);
  const dictionary = getDictionary(resolvedLocale);
  const demo = getSoreyaDemoData(resolvedLocale);
  const now = new Date();
  const requestedStart = addMinutes(now, 24 * 60 + 90);
  const requestedEnd = addMinutes(requestedStart, 30);
  const normalizedText = rawText.trim();
  const customerName = inferCustomerName(normalizedText, translate(dictionary, "quickCall.noCustomer"));
  const callNoteId = makeDemoId("quick-call-note");
  const action = buildSuggestedAction(resolvedLocale, {
    actionType: "callback_reminder",
    title: translate(dictionary, "demo.generated.quickCallTitle"),
    rationale: translate(dictionary, "demo.generated.quickCallRationale"),
    draftPayload: {
      demo: true,
      provider: "quick_call",
      recipient: customerName,
      requestedDateTimeText: formatDemoDate(requestedStart, resolvedLocale),
      body: translate(dictionary, "demo.generated.quickCallBody", { text: normalizedText }),
    },
    riskLevel: "low",
    callNoteId,
  });

  const callNote: QuickCallNote = {
    id: callNoteId,
    organizationId: demo.organization.id,
    createdBy: demo.membership.user_id,
    rawText: `[DEMO] ${normalizedText}`,
    status: "pending_approval",
    intentType: "callback_request",
    confidence: 0.82,
    customerName,
    customerEmail: null,
    customerPhone: null,
    requestedDateTimeText: formatDemoDate(requestedStart, resolvedLocale),
    requestedStartsAt: requestedStart.toISOString(),
    requestedEndsAt: requestedEnd.toISOString(),
    reason: normalizedText,
    extractedConstraints: { demo: true },
    analysis: {
      intentType: "callback_request",
      confidence: 0.82,
      customerName,
      requestedDateTimeText: formatDemoDate(requestedStart, resolvedLocale),
      reason: normalizedText,
      missingFields: [],
      aiProvider: "heuristic",
      usedFallback: true,
      safetyNotes: [translate(dictionary, "demo.sandboxCopy")],
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return {
    callNote,
    appointmentRequest: null,
    suggestedActions: [action],
    warnings: [translate(dictionary, "demo.sandboxCopy")],
    alternatives: [
      {
        startsAt: requestedStart.toISOString(),
        endsAt: requestedEnd.toISOString(),
        durationMinutes: 30,
        provider: "all",
        calendarAccountId: null,
      },
    ],
  };
}

export function addDemoQuickCallNote(locale: SupportedLocale, note: QuickCallNote) {
  const resolvedLocale = resolveLocale(locale);
  const next = [
    note,
    ...readDemoQuickCallNotes(resolvedLocale).filter((current) => current.id !== note.id),
  ];

  writeDemoQuickCallNotes(resolvedLocale, next);
  emitDemoStateChange("quick-call-notes", resolvedLocale);
  return next;
}

export function buildDemoEmergencyResult(locale: SupportedLocale, form: DemoEmergencyForm): EmergencyModeResult {
  const resolvedLocale = resolveLocale(locale);
  const dictionary = getDictionary(resolvedLocale);
  const demo = getSoreyaDemoData(resolvedLocale);
  const now = new Date();
  const emergencyActionId = makeDemoId("emergency-action");
  const affectedEvents = demo.calendarEvents.slice(0, form.targetWindow === "all_day" ? 3 : 2);
  const emailBody = form.customMessage.trim() || translate(dictionary, "demo.generated.emergencyEmailBody", { reason: form.reason });
  const whatsappBody = form.customMessage.trim() || translate(dictionary, "demo.generated.emergencyWhatsappBody", { reason: form.reason });
  const calendarBody = translate(dictionary, "demo.generated.emergencyCalendarBody", {
    reason: form.reason,
    targetDate: form.targetDate,
  });

  const proposals: RescheduleProposal[] = affectedEvents.slice(0, 2).map((event, index) => ({
    id: makeDemoId(`emergency-proposal-${index + 1}`),
    organizationId: demo.organization.id,
    emergencyActionId,
    rescheduleBatchId: null,
    calendarEventId: event.id,
    contactId: null,
    originalStartsAt: event.startsAt,
    originalEndsAt: event.endsAt,
    proposedStartsAt: null,
    proposedEndsAt: null,
    recipientName: event.attendees[0]?.displayName ?? null,
    recipientEmail: event.attendees[0]?.email ?? null,
    recipientPhone: index === 1 ? "+393331234567" : null,
    preferredChannel: index === 1 ? "whatsapp" : "email",
    messageBody: index === 1 ? whatsappBody : emailBody,
    status: "draft",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }));

  const actions = [
    buildSuggestedAction(resolvedLocale, {
      actionType: "notify_delay_email",
      title: translate(dictionary, "demo.generated.emergencyEmailTitle"),
      rationale: translate(dictionary, "demo.generated.emergencyEmailRationale"),
      draftPayload: {
        demo: true,
        provider: "emergency",
        recipientEmail: proposals[0]?.recipientEmail ?? "demo@example.test",
        recipient: proposals[0]?.recipientName ?? translate(dictionary, "emergency.manualReview"),
        body: emailBody,
      },
      riskLevel: "high",
      emergencyActionId,
      rescheduleProposalId: proposals[0]?.id ?? null,
    }),
    buildSuggestedAction(resolvedLocale, {
      actionType: "notify_delay_whatsapp",
      title: translate(dictionary, "demo.generated.emergencyWhatsappTitle"),
      rationale: translate(dictionary, "demo.generated.emergencyWhatsappRationale"),
      draftPayload: {
        demo: true,
        provider: "emergency",
        recipientPhone: proposals[1]?.recipientPhone ?? "+393330000000",
        recipient: proposals[1]?.recipientName ?? translate(dictionary, "emergency.manualReview"),
        body: whatsappBody,
      },
      riskLevel: "high",
      emergencyActionId,
      rescheduleProposalId: proposals[1]?.id ?? null,
    }),
    buildSuggestedAction(resolvedLocale, {
      actionType: "block_calendar_day",
      title: translate(dictionary, "demo.generated.emergencyCalendarTitle"),
      rationale: translate(dictionary, "demo.generated.emergencyCalendarRationale"),
      draftPayload: {
        demo: true,
        provider: "emergency",
        targetDate: form.targetDate,
        body: calendarBody,
      },
      riskLevel: "normal",
      emergencyActionId,
    }),
  ];

  return {
    emergencyAction: {
      id: emergencyActionId,
      organizationId: demo.organization.id,
      createdBy: demo.membership.user_id,
      type: form.type,
      status: "pending_approval",
      reason: form.reason,
      targetDate: form.targetDate,
      delayMinutes: form.delayMinutes,
      messageTone: form.messageTone,
      affectedEventsCount: affectedEvents.length,
      suggestedActionsCount: actions.length,
      metadata: {
        demo: true,
        targetWindow: form.targetWindow,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    affectedEvents,
    proposals,
    suggestedActions: actions,
    warnings: [translate(dictionary, "demo.generated.emergencyWarning")],
  };
}

function readDemoQuickCallNotes(locale: SupportedLocale): QuickCallNote[] {
  const resolvedLocale = resolveLocale(locale);
  const cached = quickCallNoteCache[resolvedLocale];

  if (cached) {
    return cached;
  }

  const stored = readJson<QuickCallNote[]>(storageKey("quick-call-notes", resolvedLocale));

  if (Array.isArray(stored)) {
    quickCallNoteCache[resolvedLocale] = stored;
    return stored;
  }

  const notes = getSoreyaDemoData(resolvedLocale).quickCallNotes;
  writeDemoQuickCallNotes(resolvedLocale, notes);
  return notes;
}

function writeDemoSuggestedActions(locale: SupportedLocale, actions: SuggestedAction[]) {
  actionCache[locale] = actions;
  writeJson(storageKey("actions", locale), actions);
  writeDemoPlaygroundApprovals(locale, actions);
}

function writeDemoQuickCallNotes(locale: SupportedLocale, notes: QuickCallNote[]) {
  quickCallNoteCache[locale] = notes;
  writeJson(storageKey("quick-call-notes", locale), notes);
}

function buildSuggestedAction(locale: SupportedLocale, input: SuggestedActionInput): SuggestedAction {
  const demo = getSoreyaDemoData(locale);
  const now = new Date();

  return {
    id: makeDemoId("suggested-action"),
    organization_id: demo.organization.id,
    appointment_request_id: null,
    emergency_action_id: input.emergencyActionId ?? null,
    reschedule_proposal_id: input.rescheduleProposalId ?? null,
    call_note_id: input.callNoteId ?? null,
    incoming_message_id: null,
    contact_id: null,
    action_type: input.actionType,
    status: "pending_approval",
    title: input.title,
    rationale: input.rationale,
    draft_payload: input.draftPayload,
    external_payload: { demo: true },
    risk_level: input.riskLevel,
    requires_approval: true,
    approved_by: null,
    approved_at: null,
    execution_status: "dry_run",
    executed_at: null,
    failed_reason: null,
    expires_at: addMinutes(now, 48 * 60).toISOString(),
    created_by_ai: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function storageKey(scope: DemoStateScope, locale: SupportedLocale) {
  return `soreya.demo.${scope}.${locale}.v1`;
}

function subscribeDemoState(scope: DemoStateScope, locale: SupportedLocale, onStoreChange: () => void) {
  function handleStateChange(event: Event) {
    const detail = event instanceof CustomEvent ? event.detail as { scope?: DemoStateScope; locale?: SupportedLocale } : null;

    if (!detail || (detail.scope === scope && detail.locale === locale)) {
      onStoreChange();
    }
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey(scope, locale) || (scope === "actions" && event.key === DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY)) {
      clearCache(scope, locale);
      onStoreChange();
    }
  }

  window.addEventListener(DEMO_EVENT_NAME, handleStateChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(DEMO_EVENT_NAME, handleStateChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function clearCache(scope: DemoStateScope, locale: SupportedLocale) {
  if (scope === "actions") {
    delete actionCache[locale];
    return;
  }

  delete quickCallNoteCache[locale];
}

function getFallbackSuggestedActions(locale: SupportedLocale) {
  const cached = fallbackActionSnapshots[locale];

  if (cached) {
    return cached;
  }

  const actions = getSoreyaDemoData(locale).suggestedActions;
  fallbackActionSnapshots[locale] = actions;
  return actions;
}

function getFallbackQuickCallNotes(locale: SupportedLocale) {
  const cached = fallbackQuickCallNoteSnapshots[locale];

  if (cached) {
    return cached;
  }

  const notes = getSoreyaDemoData(locale).quickCallNotes;
  fallbackQuickCallNoteSnapshots[locale] = notes;
  return notes;
}

function emitDemoStateChange(scope: DemoStateScope, locale: SupportedLocale) {
  window.dispatchEvent(new CustomEvent(DEMO_EVENT_NAME, { detail: { scope, locale } }));
}

function mergeDemoPlaygroundApprovals(actions: SuggestedAction[], locale: SupportedLocale) {
  const playgroundActions = readDemoPlaygroundApprovals(locale);

  if (playgroundActions.length === 0) {
    return actions;
  }

  const playgroundIds = new Set(playgroundActions.map((action) => action.id));
  return [
    ...playgroundActions,
    ...actions.filter((action) => !playgroundIds.has(action.id)),
  ];
}

function readDemoPlaygroundApprovals(locale: SupportedLocale) {
  const stored = readJson<SuggestedAction[]>(DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.filter((action) => isDemoPlaygroundAction(action, locale));
}

function writeDemoPlaygroundApprovals(locale: SupportedLocale, actions: SuggestedAction[]) {
  const playgroundActions = actions.filter((action) => isDemoPlaygroundAction(action, locale));
  const stored = readJson<SuggestedAction[]>(DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY);
  const existing = Array.isArray(stored) ? stored : [];
  const nextIds = new Set(playgroundActions.map((action) => action.id));
  const next = [
    ...playgroundActions,
    ...existing.filter((action) => !nextIds.has(action.id) && !isDemoPlaygroundAction(action, locale)),
  ];

  writeJson(DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY, next);
}

function isDemoPlaygroundAction(action: SuggestedAction, locale: SupportedLocale) {
  const payload = toJsonObject(action.draft_payload);
  const payloadLocale = typeof payload.locale === "string" ? resolveLocale(payload.locale) : locale;
  return (payload.demoPlayground === true || payload.provider === "demo_playground") && payloadLocale === locale;
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function inferCustomerName(rawText: string, fallback: string) {
  const words = rawText
    .replace(/[.,;:!?]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.length ? words.join(" ") : fallback;
}

function makeDemoId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatDemoDate(value: Date, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
