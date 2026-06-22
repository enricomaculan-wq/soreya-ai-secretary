import { getSoreyaDemoData } from "./demo-data";
import { getDictionary, resolveLocale, t as translate, type SupportedLocale } from "./i18n";
import type { AvailabilitySlot, Json, SuggestedAction, SuggestedActionType, Uuid } from "./index";

export type DemoPlaygroundChannel = "email" | "whatsapp" | "quick_call";
export type DemoDetectedIntent =
  | "new_appointment"
  | "reschedule_appointment"
  | "delay_notice"
  | "cancel_appointment"
  | "appointment_lookup"
  | "appointment_confirmation"
  | "callback_request"
  | "manual_review";

export type DemoCustomerRequestInput = {
  channel: DemoPlaygroundChannel;
  customerText: string;
  locale?: SupportedLocale | string;
  scenario?: "default" | "conflict" | "ambiguous" | string;
};

export type DemoAvailabilityResult = {
  conflictDetected: boolean;
  alternatives: AvailabilitySlot[];
};

export type DemoAppointmentRequest = {
  id: string;
  type:
    | "new_appointment"
    | "reschedule_existing"
    | "delay_existing"
    | "lookup_existing"
    | "callback_request"
    | "generic_request"
    | "unknown";
  summary: string;
  requestedDateTimeText: string;
  reason: string;
  needsClarification: boolean;
  clarificationQuestion?: string | null;
  alternatives: string[];
};

export type DemoLinkedAppointment = {
  title: string;
  startsAtText: string;
  reason: string;
};

export type DemoCustomerRequestAnalysis = DemoCustomerRequestInput & {
  locale: SupportedLocale;
  detectedIntent: DemoDetectedIntent;
  isAppointmentRequest: boolean;
  confidence: number;
  customerName: string | null;
  senderText?: string;
  senderName?: string | null;
  senderContact?: string | null;
  senderSource?: DemoPlaygroundChannel | string;
  customerIdentified?: boolean;
  appointmentContextType?:
    | "new_appointment"
    | "reschedule_existing"
    | "delay_existing"
    | "cancel_existing"
    | "lookup_existing"
    | "callback_request"
    | "generic_request"
    | "unknown";
  matchedAppointment?: {
    found: boolean;
    title: string | null;
    customerName: string | null;
    startsAtText: string | null;
    reason: string | null;
    confidence: number;
  };
  appointmentRequests?: DemoAppointmentRequest[];
  hasMultipleRequests?: boolean;
  primaryRequestSummary?: string;
  linkedAppointments?: DemoLinkedAppointment[];
  hasLinkedAppointments?: boolean;
  cancellationScope?: "all_future" | "single_or_unspecified" | null;
  isThirdPartyRequest?: boolean;
  referredPersonName?: string | null;
  referredPersonPhone?: string | null;
  referredByName?: string | null;
  referredByContact?: string | null;
  urgency?: "normal" | "urgent";
  contactActionType?:
    | "ask_sender_clarification"
    | "prepare_message_to_referred_person"
    | "manual_review"
    | null;
  requestedDateTimeText: string | null;
  requestedNewDateText?: string | null;
  proposedMoveToText?: string | null;
  requestedStartsAt: string | null;
  requestedEndsAt: string | null;
  reason?: string | null;
  conflictDetected: boolean;
  alternatives: AvailabilitySlot[];
  summary?: string;
  needsCalendarCheck?: boolean;
  suggestedReply: string;
  needsMoreInfo: boolean;
  needsClarification?: boolean;
  clarificationQuestion?: string | null;
  missingFields: string[];
  recommendedNextStep?:
    | "ask_clarification"
    | "propose_slots"
    | "propose_reschedule"
    | "approve_reply"
    | "manual_review";
  requiresOperatorAttention?: boolean;
  operatorAttentionCategory?:
    | "billing"
    | "complaint"
    | "medical_advice"
    | "certificate"
    | "general"
    | null;
  safetyNotes: string[];
  demoSuggestedAction: SuggestedActionType;
  aiProvider: "openai" | "heuristic";
  aiModel: string | null;
  usedFallback: boolean;
};

type DemoAnalysisCore = Omit<
  DemoCustomerRequestAnalysis,
  "alternatives" | "conflictDetected" | "suggestedReply" | "safetyNotes"
> & {
  requestedWindowStart: string | null;
  requestedWindowEnd: string | null;
  parsedTimeIsApproximate: boolean;
  delayMinutes: number | null;
};

const APPOINTMENT_KEYWORDS = [
  "appuntamento",
  "preventivo",
  "consulenza",
  "sopralluogo",
  "passare",
  "disponibilita",
  "availability",
  "available",
  "fissare",
  "prenotare",
  "appointment",
  "quote",
  "consultation",
  "book",
  "schedule",
  "visit",
  "come",
] as const;

const RESCHEDULE_KEYWORDS = [
  "spost",
  "spostiamo",
  "rimand",
  "rinvia",
  "posticip",
  "anticip",
  "riprogram",
  "cambiare appuntamento",
  "cambio appuntamento",
  "move",
  "move appointment",
  "move our meeting",
  "resched",
  "change",
  "change the appointment",
  "postpone",
] as const;

const CALLBACK_KEYWORDS = [
  "richiam",
  "chiamami",
  "mi richiami",
  "call me back",
  "call back",
  "callback",
  "phone me",
] as const;

const DELAY_KEYWORDS = [
  "ritardo",
  "in ritardo",
  "possiamo piu tardi",
  "sentirci piu tardi",
  "tra un'ora",
  "fra un'ora",
  "running late",
  "late",
  "talk later",
  "speak later",
  "in an hour",
  "delayed",
  "delay",
] as const;

const CANCELLATION_KEYWORDS = [
  "annullare",
  "cancellare",
  "disdire",
  "eliminare appuntamento",
  "annullare tutti gli appuntamenti",
  "cancellare tutti gli appuntamenti",
  "non ho piu bisogno",
  "ho trovato un'altra soluzione",
  "ho trovato un altra soluzione",
  "ho risolto diversamente",
  "cancel",
  "cancel all appointments",
  "cancel my appointments",
  "no longer need",
  "found another solution",
  "solved it another way",
] as const;

const APPOINTMENT_LOOKUP_PATTERNS = [
  /non\s+(?:mi\s+)?ricordo\s+(?:piu\s+)?quando\s+ho\s+l?'?appuntamento/,
  /mi\s+ricordi\s+(?:l?'?appuntamento|quando|a\s+che\s+ora)/,
  /quando\s+ho\s+(?:l?'?appuntamento|appuntamento)/,
  /(?:riesci\s+a\s+guardare|puoi\s+controllare).*appuntamento/,
  /appuntamento.*(?:riesci\s+a\s+guardare|puoi\s+controllare)/,
  /quando\s+ci\s+vediamo/,
  /a\s+che\s+ora\s+ho\s+l?'?appuntamento/,
  /che\s+giorno\s+ho\s+l?'?appuntamento/,
  /when\s+is\s+my\s+appointment/,
  /what\s+time\s+is\s+my\s+appointment/,
  /can\s+you\s+remind\s+me\s+when\s+my\s+appointment\s+is/,
  /remind\s+me\s+when\s+my\s+appointment\s+is/,
  /i\s+don'?t\s+remember\s+my\s+appointment/,
  /can\s+you\s+check\s+my\s+appointment/,
  /when\s+are\s+we\s+meeting/,
] as const;

export function analyzeDemoCustomerRequest(input: DemoCustomerRequestInput): DemoCustomerRequestAnalysis {
  const core = analyzeDemoCustomerRequestCore(input);
  const availability = resolveDemoAvailability(core);
  const analysisWithoutReply: DemoCustomerRequestAnalysis = {
    ...core,
    conflictDetected: availability.conflictDetected,
    alternatives: availability.alternatives,
    safetyNotes: buildSafetyNotes(core.locale),
    suggestedReply: "",
  };

  return {
    ...analysisWithoutReply,
    suggestedReply: buildSuggestedReplyFromAnalysis(analysisWithoutReply),
  };
}

export function buildDemoSuggestedReply(input: DemoCustomerRequestInput | DemoCustomerRequestAnalysis): string {
  const analysis = isDemoAnalysis(input) ? input : analyzeDemoCustomerRequest(input);
  return analysis.suggestedReply || buildSuggestedReplyFromAnalysis(analysis);
}

export function buildDemoApprovalFromRequest(input: DemoCustomerRequestInput | DemoCustomerRequestAnalysis): SuggestedAction {
  const analysis = isDemoAnalysis(input) ? input : analyzeDemoCustomerRequest(input);
  const dictionary = getDictionary(analysis.locale);
  const demo = getSoreyaDemoData(analysis.locale);
  const now = new Date();
  const recipient = analysis.customerName ?? translate(dictionary, "demoPlayground.engine.unknownCustomer");
  const draftPayload: Json = {
    demo: true,
    demoPlayground: true,
    provider: "demo_playground",
    channel: analysis.channel,
    locale: analysis.locale,
    recipient,
    customerName: analysis.customerName,
    senderText: analysis.senderText,
    senderName: analysis.senderName,
    senderContact: analysis.senderContact,
    senderSource: analysis.senderSource,
    customerIdentified: analysis.customerIdentified,
    appointmentContextType: analysis.appointmentContextType,
    matchedAppointment: analysis.matchedAppointment as Json,
    appointmentRequests: analysis.appointmentRequests as Json,
    hasMultipleRequests: analysis.hasMultipleRequests,
    primaryRequestSummary: analysis.primaryRequestSummary,
    linkedAppointments: analysis.linkedAppointments as Json,
    hasLinkedAppointments: analysis.hasLinkedAppointments,
    cancellationScope: analysis.cancellationScope,
    isThirdPartyRequest: analysis.isThirdPartyRequest,
    referredPersonName: analysis.referredPersonName,
    referredPersonPhone: analysis.referredPersonPhone,
    referredByName: analysis.referredByName,
    referredByContact: analysis.referredByContact,
    urgency: analysis.urgency,
    contactActionType: analysis.contactActionType,
    detectedIntent: analysis.detectedIntent,
    confidence: analysis.confidence,
    requestedDateTimeText: analysis.requestedDateTimeText,
    requestedNewDateText: analysis.requestedNewDateText,
    proposedMoveToText: analysis.proposedMoveToText,
    requestedStartsAt: analysis.requestedStartsAt,
    requestedEndsAt: analysis.requestedEndsAt,
    reason: analysis.reason,
    conflictDetected: analysis.conflictDetected,
    alternatives: analysis.alternatives as unknown as Json,
    body: analysis.suggestedReply,
    sourceCustomerText: analysis.customerText,
    safetyNotes: analysis.safetyNotes,
    summary: analysis.summary,
    needsCalendarCheck: analysis.needsCalendarCheck,
    needsClarification: analysis.needsClarification,
    clarificationQuestion: analysis.clarificationQuestion,
    recommendedNextStep: analysis.recommendedNextStep,
    aiProvider: analysis.aiProvider,
    aiModel: analysis.aiModel,
    usedFallback: analysis.usedFallback,
    execution: "dry_run",
  };

  return {
    id: makeDemoId("demo-playground-action") as Uuid,
    organization_id: demo.organization.id,
    appointment_request_id: null,
    emergency_action_id: null,
    reschedule_proposal_id: null,
    call_note_id: null,
    incoming_message_id: null,
    contact_id: null,
    action_type: analysis.demoSuggestedAction,
    status: "pending_approval",
    title: buildActionTitle(analysis),
    rationale: buildActionRationale(analysis),
    draft_payload: draftPayload,
    external_payload: {
      demo: true,
      provider: "demo_playground",
      dryRun: true,
      approvalFirst: true,
    },
    risk_level: analysis.conflictDetected || analysis.detectedIntent === "delay_notice" ? "normal" : "low",
    requires_approval: true,
    approved_by: null,
    approved_at: null,
    execution_status: "dry_run",
    executed_at: null,
    failed_reason: null,
    expires_at: addDays(now, 2).toISOString(),
    created_by_ai: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

export function getDemoAvailability(input: DemoCustomerRequestInput | DemoCustomerRequestAnalysis): DemoAvailabilityResult {
  const core = analyzeDemoCustomerRequestCore(input);
  return resolveDemoAvailability(core);
}

function analyzeDemoCustomerRequestCore(input: DemoCustomerRequestInput): DemoAnalysisCore {
  const locale = resolveLocale(input.locale);
  const dictionary = getDictionary(locale);
  const customerText = input.customerText.trim();
  const normalizedText = normalizeText(customerText);
  const detectedIntent = detectIntent(normalizedText);
  const isAppointmentRequest = detectedIntent === "new_appointment" || detectedIntent === "reschedule_appointment" || detectedIntent === "appointment_lookup";
  const parsedDateTime = parseRequestedDateTime(normalizedText);
  const customerName = extractCustomerName(customerText);
  const delayMinutes = extractDelayMinutes(normalizedText);
  const missingFields = buildMissingFields({
    detectedIntent,
    dictionary,
    hasText: Boolean(customerText),
    parsedDateTime,
  });
  const needsMoreInfo = missingFields.length > 0 || input.scenario === "ambiguous";

  return {
    channel: input.channel,
    customerText,
    locale,
    scenario: input.scenario,
    detectedIntent,
    isAppointmentRequest,
    confidence: calculateConfidence(detectedIntent, parsedDateTime, Boolean(customerText), needsMoreInfo),
    customerName,
    requestedDateTimeText: parsedDateTime.requestedDateTimeText,
    appointmentRequests: [],
    hasMultipleRequests: false,
    primaryRequestSummary: "",
    linkedAppointments: [],
    hasLinkedAppointments: false,
    cancellationScope: null,
    isThirdPartyRequest: false,
    referredPersonName: null,
    referredPersonPhone: null,
    referredByName: null,
    referredByContact: null,
    urgency: "normal",
    contactActionType: null,
    requestedNewDateText: null,
    proposedMoveToText: null,
    requestedStartsAt: parsedDateTime.requestedStartsAt?.toISOString() ?? null,
    requestedEndsAt: parsedDateTime.requestedEndsAt?.toISOString() ?? null,
    requestedWindowStart: parsedDateTime.requestedWindowStart?.toISOString() ?? null,
    requestedWindowEnd: parsedDateTime.requestedWindowEnd?.toISOString() ?? null,
    parsedTimeIsApproximate: parsedDateTime.timeIsApproximate,
    delayMinutes,
    needsMoreInfo,
    missingFields,
    demoSuggestedAction: selectSuggestedAction(input.channel, detectedIntent, needsMoreInfo),
    aiProvider: "heuristic",
    aiModel: null,
    usedFallback: true,
  };
}

function resolveDemoAvailability(core: DemoAnalysisCore): DemoAvailabilityResult {
  if (core.detectedIntent === "appointment_lookup") {
    return {
      conflictDetected: false,
      alternatives: [],
    };
  }

  if (!core.isAppointmentRequest && core.detectedIntent !== "callback_request") {
    return {
      conflictDetected: false,
      alternatives: [],
    };
  }

  const events = getSoreyaDemoData(core.locale).calendarEvents;
  const durationMinutes = 30;
  const requestedStart = core.requestedStartsAt ? new Date(core.requestedStartsAt) : null;
  const requestedEnd = core.requestedEndsAt ? new Date(core.requestedEndsAt) : null;
  const windowStart = core.requestedWindowStart ? new Date(core.requestedWindowStart) : requestedStart;
  const windowEnd = core.requestedWindowEnd ? new Date(core.requestedWindowEnd) : requestedEnd;
  const hasExactRequest = Boolean(requestedStart && requestedEnd && !core.parsedTimeIsApproximate);
  const conflictDetected = core.scenario === "conflict"
    ? true
    : Boolean(windowStart && windowEnd && events.some((event) => overlaps(windowStart, windowEnd, event.startsAt, event.endsAt)));
  const searchStart = windowStart ?? startOfNextWorkingDay(new Date());
  const alternatives = findDemoAvailableSlots({
    events,
    rangeStart: searchStart,
    rangeEnd: addDays(searchStart, core.detectedIntent === "callback_request" ? 3 : 8),
    durationMinutes,
    includeFirstSlot: hasExactRequest && !conflictDetected ? requestedStart : null,
  }).slice(0, 3);

  return {
    conflictDetected,
    alternatives,
  };
}

function buildSuggestedReplyFromAnalysis(analysis: DemoCustomerRequestAnalysis): string {
  const dictionary = getDictionary(analysis.locale);
  const alternatives = formatAlternatives(analysis.alternatives, analysis.locale);
  const requestedTime = analysis.requestedDateTimeText ?? translate(dictionary, "demoPlayground.engine.noRequestedTime");

  if (!analysis.customerText.trim()) {
    return translate(dictionary, "demoPlayground.engine.replies.empty");
  }

  if (analysis.detectedIntent === "manual_review") {
    return translate(dictionary, "demoPlayground.engine.replies.manualReview");
  }

  if (analysis.detectedIntent === "delay_notice") {
    return translate(dictionary, "demoPlayground.engine.replies.delay", {
      minutes: analysisToDelayMinutes(analysis) ?? 20,
    });
  }

  if (analysis.detectedIntent === "cancel_appointment") {
    return translate(dictionary, "demoPlayground.engine.replies.cancelAppointment");
  }

  if (analysis.detectedIntent === "callback_request") {
    return analysis.needsMoreInfo
      ? translate(dictionary, "demoPlayground.engine.replies.callbackNeedsInfo", { requestedTime, alternatives })
      : translate(dictionary, "demoPlayground.engine.replies.callback", { requestedTime });
  }

  if (analysis.detectedIntent === "appointment_lookup") {
    return translate(dictionary, "demoPlayground.engine.replies.appointmentLookup", {
      startsAt: analysis.locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM",
    });
  }

  if (analysis.detectedIntent === "reschedule_appointment") {
    return translate(dictionary, "demoPlayground.engine.replies.reschedule", {
      requestedTime,
      alternatives,
    });
  }

  if (analysis.detectedIntent === "appointment_confirmation") {
    return translate(dictionary, "demoPlayground.engine.replies.appointmentConfirmation", {
      confirmedTime: requestedTime,
    });
  }

  if (analysis.conflictDetected) {
    return translate(dictionary, "demoPlayground.engine.replies.appointmentConflict", {
      requestedTime,
      alternatives,
    });
  }

  if (analysis.needsMoreInfo) {
    return translate(dictionary, "demoPlayground.engine.replies.appointmentNeedsInfo", {
      requestedTime,
      alternatives,
    });
  }

  return translate(dictionary, "demoPlayground.engine.replies.appointmentAvailable", {
    requestedTime,
    alternatives,
  });
}

function buildSafetyNotes(locale: SupportedLocale) {
  const dictionary = getDictionary(locale);
  return [
    translate(dictionary, "demoPlayground.simulationCopy"),
    translate(dictionary, "demoPlayground.safety.approvalFirst"),
    translate(dictionary, "demoPlayground.safety.dryRun"),
  ];
}

function buildActionTitle(analysis: DemoCustomerRequestAnalysis) {
  const dictionary = getDictionary(analysis.locale);
  return translate(dictionary, `demoPlayground.engine.actionTitles.${analysis.detectedIntent}`);
}

function buildActionRationale(analysis: DemoCustomerRequestAnalysis) {
  const dictionary = getDictionary(analysis.locale);

  if (analysis.detectedIntent === "manual_review") {
    return translate(dictionary, "demoPlayground.engine.rationales.manualReview");
  }

  if (analysis.conflictDetected) {
    return translate(dictionary, "demoPlayground.engine.rationales.conflict");
  }

  if (analysis.needsMoreInfo) {
    return translate(dictionary, "demoPlayground.engine.rationales.needsMoreInfo");
  }

  return translate(dictionary, "demoPlayground.engine.rationales.ready");
}

function buildMissingFields(input: {
  detectedIntent: DemoDetectedIntent;
  dictionary: ReturnType<typeof getDictionary>;
  hasText: boolean;
  parsedDateTime: ParsedDateTime;
}) {
  const missingFields: string[] = [];

  if (!input.hasText) {
    missingFields.push(translate(input.dictionary, "demoPlayground.engine.missing.customerText"));
    return missingFields;
  }

  if (input.detectedIntent === "manual_review") {
    missingFields.push(translate(input.dictionary, "demoPlayground.engine.missing.manualReview"));
    return missingFields;
  }

  if (input.detectedIntent === "delay_notice") {
    return missingFields;
  }

  if (input.detectedIntent === "cancel_appointment") {
    return missingFields;
  }

  if (input.detectedIntent === "reschedule_appointment") {
    return missingFields;
  }

  if (input.detectedIntent === "appointment_lookup") {
    return missingFields;
  }

  if (!input.parsedDateTime.requestedDateTimeText) {
    missingFields.push(translate(input.dictionary, "demoPlayground.engine.missing.requestedTime"));
  }

  if (input.parsedDateTime.timeIsApproximate) {
    missingFields.push(translate(input.dictionary, "demoPlayground.engine.missing.exactTime"));
  }

  return [...new Set(missingFields)];
}

function selectSuggestedAction(
  channel: DemoPlaygroundChannel,
  intent: DemoDetectedIntent,
  needsMoreInfo: boolean,
): SuggestedActionType {
  if (intent === "manual_review") {
    return "manual_review";
  }

  if (intent === "cancel_appointment") {
    return "cancel_calendar_event";
  }

  if (intent === "callback_request") {
    return "callback_reminder";
  }

  if (intent === "delay_notice") {
    return channel === "whatsapp" ? "notify_delay_whatsapp" : "notify_delay_email";
  }

  if (intent === "reschedule_appointment") {
    return "propose_calendar_reschedule";
  }

  if (intent === "appointment_lookup") {
    return channel === "whatsapp" ? "send_whatsapp_reply" : "send_email_reply";
  }

  if (needsMoreInfo) {
    return channel === "whatsapp"
      ? "ask_whatsapp_more_info"
      : channel === "quick_call"
        ? "request_call_more_info"
        : "ask_email_more_info";
  }

  if (channel === "whatsapp") {
    return "send_whatsapp_reply";
  }

  if (channel === "quick_call") {
    return "create_calendar_event_from_call";
  }

  return "send_email_reply";
}

function detectIntent(text: string): DemoDetectedIntent {
  if (!text) {
    return "manual_review";
  }

  if (containsAny(text, CANCELLATION_KEYWORDS)) {
    return "cancel_appointment";
  }

  if (containsAny(text, DELAY_KEYWORDS)) {
    return "delay_notice";
  }

  if (containsAny(text, CALLBACK_KEYWORDS)) {
    return "callback_request";
  }

  if (containsAny(text, RESCHEDULE_KEYWORDS)) {
    return "reschedule_appointment";
  }

  if (isAppointmentLookupText(text)) {
    return "appointment_lookup";
  }

  if (containsAny(text, APPOINTMENT_KEYWORDS)) {
    return "new_appointment";
  }

  return "manual_review";
}

function isAppointmentLookupText(text: string) {
  return APPOINTMENT_LOOKUP_PATTERNS.some((pattern) => pattern.test(text));
}

function calculateConfidence(
  intent: DemoDetectedIntent,
  parsedDateTime: ParsedDateTime,
  hasText: boolean,
  needsMoreInfo: boolean,
) {
  if (!hasText) {
    return 0;
  }

  const baseByIntent: Record<DemoDetectedIntent, number> = {
    new_appointment: 0.72,
    reschedule_appointment: 0.82,
    delay_notice: 0.92,
    cancel_appointment: 0.9,
    appointment_lookup: 0.92,
    appointment_confirmation: 0.95,
    callback_request: 0.8,
    manual_review: 0.38,
  };
  const dateBoost = parsedDateTime.requestedDateTimeText ? 0.1 : 0;
  const exactBoost = parsedDateTime.requestedStartsAt && !parsedDateTime.timeIsApproximate ? 0.08 : 0;
  const missingPenalty = needsMoreInfo ? 0.08 : 0;

  return Math.max(0, Math.min(0.96, baseByIntent[intent] + dateBoost + exactBoost - missingPenalty));
}

type ParsedDateTime = {
  requestedDateTimeText: string | null;
  requestedStartsAt: Date | null;
  requestedEndsAt: Date | null;
  requestedWindowStart: Date | null;
  requestedWindowEnd: Date | null;
  timeIsApproximate: boolean;
};

function parseRequestedDateTime(text: string): ParsedDateTime {
  const now = new Date();
  const dateResult = parseDateReference(text, now);
  const timeResult = parseTimeReference(text);
  const requestedDateTimeText = [dateResult?.label, timeResult?.label].filter(Boolean).join(" ") || null;

  if (!dateResult) {
    return {
      requestedDateTimeText,
      requestedStartsAt: null,
      requestedEndsAt: null,
      requestedWindowStart: null,
      requestedWindowEnd: null,
      timeIsApproximate: Boolean(timeResult?.approximate),
    };
  }

  if (dateResult.approximateRange) {
    return {
      requestedDateTimeText,
      requestedStartsAt: null,
      requestedEndsAt: null,
      requestedWindowStart: dateResult.approximateRange.start,
      requestedWindowEnd: dateResult.approximateRange.end,
      timeIsApproximate: true,
    };
  }

  if (!timeResult) {
    return {
      requestedDateTimeText,
      requestedStartsAt: null,
      requestedEndsAt: null,
      requestedWindowStart: atLocal(dateKey(dateResult.date), 9, 0),
      requestedWindowEnd: atLocal(dateKey(dateResult.date), 17, 0),
      timeIsApproximate: true,
    };
  }

  if (timeResult.approximate) {
    return {
      requestedDateTimeText,
      requestedStartsAt: null,
      requestedEndsAt: null,
      requestedWindowStart: atLocal(dateKey(dateResult.date), timeResult.windowStartHour ?? 9, 0),
      requestedWindowEnd: atLocal(dateKey(dateResult.date), timeResult.windowEndHour ?? 17, 0),
      timeIsApproximate: true,
    };
  }

  const requestedStartsAt = atLocal(dateKey(dateResult.date), timeResult.hour, timeResult.minute);

  return {
    requestedDateTimeText,
    requestedStartsAt,
    requestedEndsAt: addMinutes(requestedStartsAt, 30),
    requestedWindowStart: requestedStartsAt,
    requestedWindowEnd: addMinutes(requestedStartsAt, 30),
    timeIsApproximate: false,
  };
}

function parseDateReference(text: string, now: Date) {
  if (/\b(prossima settimana|next week)\b/i.test(text)) {
    const start = nextWeekStart(now);
    return {
      label: matchFirst(text, ["prossima settimana", "next week"]) ?? "next week",
      date: start,
      approximateRange: {
        start: atLocal(dateKey(start), 9, 0),
        end: atLocal(dateKey(addDays(start, 4)), 17, 0),
      },
    };
  }

  if (/\b(dopodomani|day after tomorrow)\b/i.test(text)) {
    return { label: matchFirst(text, ["dopodomani", "day after tomorrow"]) ?? "day after tomorrow", date: addDays(now, 2) };
  }

  if (/\b(domani|tomorrow)\b/i.test(text)) {
    return { label: matchFirst(text, ["domani", "tomorrow"]) ?? "tomorrow", date: addDays(now, 1) };
  }

  if (/\b(oggi|today)\b/i.test(text)) {
    return { label: matchFirst(text, ["oggi", "today"]) ?? "today", date: now };
  }

  const weekday = parseWeekday(text);

  if (weekday) {
    return {
      label: weekday.label,
      date: nextWeekday(now, weekday.dayOfWeek),
    };
  }

  return null;
}

function parseTimeReference(text: string) {
  const englishTime = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (englishTime) {
    const hourValue = Number(englishTime[1]);
    const period = englishTime[3].toLowerCase();
    const hour = period === "pm" && hourValue < 12
      ? hourValue + 12
      : period === "am" && hourValue === 12
        ? 0
        : hourValue;

    return {
      label: englishTime[0],
      hour,
      minute: englishTime[2] ? Number(englishTime[2]) : 0,
      approximate: false,
    };
  }

  const italianTime = text.match(/\b(?:alle|verso le|per le|at)\s+(\d{1,2})(?:[:.](\d{2}))?\b/i);

  if (italianTime) {
    return {
      label: italianTime[0],
      hour: Number(italianTime[1]),
      minute: italianTime[2] ? Number(italianTime[2]) : 0,
      approximate: false,
    };
  }

  const clockTime = text.match(/\b(\d{1,2})[:.](\d{2})\b/);

  if (clockTime) {
    return {
      label: clockTime[0],
      hour: Number(clockTime[1]),
      minute: Number(clockTime[2]),
      approximate: false,
    };
  }

  if (/\b(pomeriggio|afternoon)\b/i.test(text)) {
    return {
      label: matchFirst(text, ["pomeriggio", "afternoon"]) ?? "afternoon",
      hour: 15,
      minute: 0,
      approximate: true,
      windowStartHour: 14,
      windowEndHour: 18,
    };
  }

  if (/\b(mattina|morning)\b/i.test(text)) {
    return {
      label: matchFirst(text, ["mattina", "morning"]) ?? "morning",
      hour: 10,
      minute: 0,
      approximate: true,
      windowStartHour: 9,
      windowEndHour: 12,
    };
  }

  return null;
}

function parseWeekday(text: string) {
  const weekdays = [
    { dayOfWeek: 1, names: ["lunedi", "lunedi'", "lunedì", "lunedì", "monday"] },
    { dayOfWeek: 2, names: ["martedi", "martedi'", "martedì", "martedì", "tuesday"] },
    { dayOfWeek: 3, names: ["mercoledi", "mercoledi'", "mercoledì", "mercoledì", "wednesday"] },
    { dayOfWeek: 4, names: ["giovedi", "giovedi'", "giovedì", "giovedì", "thursday"] },
    { dayOfWeek: 5, names: ["venerdi", "venerdi'", "venerdì", "venerdì", "friday"] },
    { dayOfWeek: 6, names: ["sabato", "saturday"] },
    { dayOfWeek: 0, names: ["domenica", "sunday"] },
  ];

  for (const weekday of weekdays) {
    const match = weekday.names.find((name) => text.includes(name));

    if (match) {
      return {
        dayOfWeek: weekday.dayOfWeek,
        label: match,
      };
    }
  }

  return null;
}

function findDemoAvailableSlots(input: {
  events: ReturnType<typeof getSoreyaDemoData>["calendarEvents"];
  rangeStart: Date;
  rangeEnd: Date;
  durationMinutes: number;
  includeFirstSlot: Date | null;
}) {
  const slots: AvailabilitySlot[] = [];

  if (input.includeFirstSlot && isWithinWorkingHours(input.includeFirstSlot) && !hasConflict(input.events, input.includeFirstSlot, addMinutes(input.includeFirstSlot, input.durationMinutes))) {
    slots.push(toSlot(input.includeFirstSlot, addMinutes(input.includeFirstSlot, input.durationMinutes), input.durationMinutes));
  }

  for (
    let cursor = roundUpToNextHalfHour(input.rangeStart);
    cursor.getTime() <= input.rangeEnd.getTime() && slots.length < 3;
    cursor = addMinutes(cursor, 30)
  ) {
    if (!isWithinWorkingHours(cursor)) {
      continue;
    }

    const slotEnd = addMinutes(cursor, input.durationMinutes);

    if (slotEnd.getTime() > input.rangeEnd.getTime() || hasConflict(input.events, cursor, slotEnd)) {
      continue;
    }

    if (slots.some((slot) => slot.startsAt === cursor.toISOString())) {
      continue;
    }

    slots.push(toSlot(cursor, slotEnd, input.durationMinutes));
  }

  return slots;
}

function hasConflict(events: ReturnType<typeof getSoreyaDemoData>["calendarEvents"], startsAt: Date, endsAt: Date) {
  return events.some((event) => overlaps(startsAt, endsAt, event.startsAt, event.endsAt));
}

function overlaps(start: Date, end: Date, eventStart: string, eventEnd: string) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const eventStartMs = new Date(eventStart).getTime();
  const eventEndMs = new Date(eventEnd).getTime();
  return startMs < eventEndMs && endMs > eventStartMs;
}

function toSlot(startsAt: Date, endsAt: Date, durationMinutes: number): AvailabilitySlot {
  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes,
    provider: "all",
    calendarAccountId: null,
  };
}

function isWithinWorkingHours(date: Date) {
  const day = date.getDay();
  const hour = date.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

function startOfNextWorkingDay(now: Date) {
  let candidate = atLocal(dateKey(now), 9, 0);

  if (candidate.getTime() <= now.getTime()) {
    candidate = atLocal(dateKey(addDays(now, 1)), 9, 0);
  }

  while (!isWithinWorkingHours(candidate)) {
    candidate = atLocal(dateKey(addDays(candidate, 1)), 9, 0);
  }

  return candidate;
}

function nextWeekStart(now: Date) {
  const currentDay = now.getDay();
  const daysUntilNextMonday = ((8 - currentDay) % 7) || 7;
  return addDays(now, daysUntilNextMonday);
}

function nextWeekday(now: Date, targetDay: number) {
  const currentDay = now.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
  return addDays(now, daysUntilTarget);
}

function atLocal(day: string, hour: number, minute: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, hour, minute, 0, 0);
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function roundUpToNextHalfHour(value: Date) {
  const next = new Date(value);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  const remainder = minutes % 30;

  if (remainder !== 0) {
    next.setMinutes(minutes + (30 - remainder));
  }

  if (next.getTime() < Date.now()) {
    return roundUpToNextHalfHour(addMinutes(new Date(), 30));
  }

  return next;
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60_000);
}

function extractDelayMinutes(text: string) {
  const match = text.match(/\b(\d{1,3})\s*(?:minuti|min|minutes|minute)\b/i);
  return match ? Number(match[1]) : null;
}

function extractCustomerName(text: string) {
  const match = text.match(/\b(?:sono|mi chiamo|this is|i am|i'm|my name is)\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ']+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ']+)?)\b/);
  return match?.[1] ?? null;
}

function containsAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function matchFirst(text: string, values: string[]) {
  return values.find((value) => text.includes(value)) ?? null;
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatAlternatives(alternatives: AvailabilitySlot[], locale: SupportedLocale) {
  if (alternatives.length === 0) {
    return getDictionary(locale) ? translate(getDictionary(locale), "demoPlayground.engine.noAlternatives") : "";
  }

  return alternatives.map((slot) => formatDateTime(slot.startsAt, locale)).join(" / ");
}

function formatDateTime(value: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function analysisToDelayMinutes(analysis: DemoCustomerRequestAnalysis) {
  const core = analysisToCore(analysis);
  return core.delayMinutes;
}

function analysisToCore(analysis: DemoCustomerRequestAnalysis): DemoAnalysisCore {
  return {
    ...analysis,
    requestedWindowStart: analysis.requestedStartsAt,
    requestedWindowEnd: analysis.requestedEndsAt,
    parsedTimeIsApproximate: analysis.needsMoreInfo && Boolean(analysis.requestedDateTimeText),
    delayMinutes: extractDelayMinutes(normalizeText(analysis.customerText)),
  };
}

function isDemoAnalysis(input: DemoCustomerRequestInput | DemoCustomerRequestAnalysis): input is DemoCustomerRequestAnalysis {
  return "detectedIntent" in input;
}

function makeDemoId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const GENERIC_DEMO_PATIENT_NAMES = new Set([
  "cliente",
  "customer",
  "paziente",
  "patient",
  "cliente whatsapp",
  "cliente email",
  "cliente da telefonata",
  "whatsapp customer",
  "email customer",
  "phone call customer",
]);

export function isGenericDemoPatientName(value: string | null | undefined) {
  if (!value?.trim()) {
    return true;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return GENERIC_DEMO_PATIENT_NAMES.has(normalized);
}

export function resolveDemoPatientFirstName(...names: Array<string | null | undefined>) {
  for (const name of names) {
    if (!name?.trim() || isGenericDemoPatientName(name)) {
      continue;
    }

    const firstName = name.trim().split(/\s+/)[0] ?? null;

    if (firstName && !isGenericDemoPatientName(firstName)) {
      return firstName;
    }
  }

  return null;
}

export type DemoAppointmentConfirmationFollowUp = {
  originalRequestText: string;
  confirmedTimeHint: string | null;
  lastStudioReply: string;
};

const DEMO_PATIENT_CONFIRMATION_PATTERNS = [
  /\bok\b/i,
  /\bokay\b/i,
  /\bs[ìi]\b/i,
  /\byes\b/i,
  /\bperfetto\b/i,
  /\bva bene\b/i,
  /\bd['’]?accordo\b/i,
  /\bconfermo\b/i,
  /\bconfermato\b/i,
  /\bottimo\b/i,
  /\bbenissimo\b/i,
];

const DEMO_NEW_REQUEST_FOLLOW_UP_PATTERNS = [
  /\bvorrei\b/i,
  /\bposso\b/i,
  /\bpossiamo\b/i,
  /\bspost/i,
  /\bannull/i,
  /\bquanto costa\b/i,
  /\bpreventivo\b/i,
  /\bchiedo\b/i,
  /\bdisponibil/i,
];

export function detectDemoCustomerGreeting(text: string): "morning" | "evening" | "informal" | null {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\b(buongiorno|good morning)\b/.test(normalized)) {
    return "morning";
  }

  if (/\b(buonasera|good afternoon|good evening)\b/.test(normalized)) {
    return "evening";
  }

  if (/\b(ciao|salve|hello|hi)\b/.test(normalized)) {
    return "informal";
  }

  return null;
}

export function formatDemoStudioGreeting(
  tone: "morning" | "evening" | "informal" | null,
  firstName: string | null,
  locale: SupportedLocale | string,
): string {
  const isItalian = resolveLocale(locale) === "it";

  if (tone === "morning") {
    return firstName
      ? isItalian
        ? `Buongiorno ${firstName},`
        : `Good morning ${firstName},`
      : isItalian
        ? "Buongiorno,"
        : "Good morning,";
  }

  if (tone === "evening") {
    return firstName
      ? isItalian
        ? `Buonasera ${firstName},`
        : `Good afternoon ${firstName},`
      : isItalian
        ? "Buonasera,"
        : "Good afternoon,";
  }

  if (tone === "informal") {
    return firstName
      ? isItalian
        ? `Ciao ${firstName},`
        : `Hi ${firstName},`
      : isItalian
        ? "Ciao,"
        : "Hi,";
  }

  return firstName
    ? isItalian
      ? `Certo ${firstName},`
      : `Sure ${firstName},`
    : isItalian
      ? "Certo,"
      : "Sure,";
}

export function alignDemoReplyWithCustomerGreeting(
  reply: string,
  customerText: string,
  firstName: string | null,
  locale: SupportedLocale | string,
) {
  const tone = detectDemoCustomerGreeting(customerText);
  if (!tone) {
    return reply;
  }

  const greeting = formatDemoStudioGreeting(tone, firstName, locale);
  const isItalian = resolveLocale(locale) === "it";
  const withName = isItalian
    ? /^(?:Certo|Buongiorno|Buonasera|Ciao|Perfetto|Sure|Good morning|Good afternoon|Hi|Hello)\s+([^,\n]+),/i
    : /^(?:Sure|Good morning|Good afternoon|Hi|Hello|Perfect)\s+([^,\n]+),/i;
  const generic = isItalian
    ? /^(?:Certo|Buongiorno|Buonasera|Ciao),/i
    : /^(?:Sure|Good morning|Good afternoon|Hi|Hello),/i;

  if (firstName && withName.test(reply)) {
    return reply.replace(withName, `${greeting}`);
  }

  if (generic.test(reply)) {
    return reply.replace(generic, `${greeting}`);
  }

  return reply;
}

export function isDemoPatientConfirmationText(text: string) {
  if (!text.trim()) {
    return false;
  }

  const normalized = text.trim().toLowerCase();
  if (DEMO_NEW_REQUEST_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return DEMO_PATIENT_CONFIRMATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isDemoNewRequestFollowUpText(text: string) {
  const normalized = text.trim().toLowerCase();
  return DEMO_NEW_REQUEST_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function extractDemoConfirmedTimeHint(latestMessage: string, studioReply: string) {
  const normalized = latestMessage.trim();

  const withMinutes =
    normalized.match(/\b(?:alle?|at)\s*(\d{1,2})[:.](\d{2})\b/i) ??
    normalized.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (withMinutes?.[1] && withMinutes[2]) {
    return `${withMinutes[1]}:${withMinutes[2]}`;
  }

  const hourOnly = normalized.match(/\b(?:alle?|at)\s+(\d{1,2})\b(?!\s*[:.])/i);
  if (hourOnly?.[1]) {
    return `${hourOnly[1]}:00`;
  }

  const studioTimes = studioReply.match(/\b\d{1,2}[:.]\d{2}\b/g) ?? [];
  if (studioTimes.length === 1) {
    return studioTimes[0].replace(".", ":");
  }

  return null;
}

export function detectDemoAppointmentConfirmationFollowUp(
  history: Array<{ role: "customer" | "studio"; body: string }>,
  latestMessage: string,
): DemoAppointmentConfirmationFollowUp | null {
  const latest = latestMessage.trim();
  if (!latest || history.length === 0) {
    return null;
  }

  const lastStudio = [...history].reverse().find((entry) => entry.role === "studio");
  if (!lastStudio) {
    return null;
  }

  const studioOfferedScheduling =
    /(disponibilit|quale orario|which (one|time)|preferisc|preferisce|proporr|first available|prima disponibilit|ho controllato l.?agenda|i checked the calendar)/i.test(
      lastStudio.body,
    );
  if (!studioOfferedScheduling) {
    return null;
  }

  if (!isDemoPatientConfirmationText(latest)) {
    return null;
  }

  const firstCustomer = history.find((entry) => entry.role === "customer")?.body ?? latest;
  return {
    originalRequestText: firstCustomer,
    confirmedTimeHint: extractDemoConfirmedTimeHint(latest, lastStudio.body),
    lastStudioReply: lastStudio.body,
  };
}
