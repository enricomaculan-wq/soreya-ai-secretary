import { callOpenAIJson, readOpenAIConfig } from "@soreya/ai";
import type {
  AvailabilitySlot,
  DemoDetectedIntent,
  DemoPlaygroundChannel,
  SuggestedActionType,
  SupportedLocale,
} from "@soreya/shared";
import { resolveLocale } from "@soreya/shared";
import { z } from "zod";

import { checkRateLimit, rateLimitResponse } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type AppointmentContextType =
  | "new_appointment"
  | "reschedule_existing"
  | "delay_existing"
  | "cancel_existing"
  | "lookup_existing"
  | "callback_request"
  | "generic_request"
  | "unknown";

type RecommendedNextStep =
  | "ask_clarification"
  | "propose_slots"
  | "propose_reschedule"
  | "approve_reply"
  | "manual_review";

type MatchedAppointment = {
  found: boolean;
  title: string | null;
  customerName: string | null;
  startsAtText: string | null;
  reason: string | null;
  confidence: number;
};

type Urgency = "normal" | "urgent";

type ContactActionType =
  | "ask_sender_clarification"
  | "prepare_message_to_referred_person"
  | "manual_review";

type CancellationScope = "all_future" | "single_or_unspecified";

type LinkedAppointment = {
  title: string;
  startsAtText: string;
  reason: string;
};

type DemoAppointmentRequest = {
  id: string;
  type: AppointmentContextType;
  summary: string;
  requestedDateTimeText: string;
  reason: string;
  needsClarification: boolean;
  clarificationQuestion?: string | null;
  alternatives: string[];
};

type DemoAppointmentRequestDraft = DemoAppointmentRequest & {
  alternativeSlots: AvailabilitySlot[];
};

type DemoAnalyzeResponse = {
  channel: DemoPlaygroundChannel;
  senderText: string;
  customerText: string;
  locale: SupportedLocale;
  detectedIntent: DemoDetectedIntent;
  isAppointmentRequest: boolean;
  confidence: number;
  customerName: string | null;
  senderName: string | null;
  senderContact: string | null;
  senderSource: DemoPlaygroundChannel;
  customerIdentified: boolean;
  appointmentContextType: AppointmentContextType;
  matchedAppointment: MatchedAppointment;
  summary: string;
  appointmentRequests: DemoAppointmentRequest[];
  hasMultipleRequests: boolean;
  primaryRequestSummary: string;
  linkedAppointments: LinkedAppointment[];
  hasLinkedAppointments: boolean;
  cancellationScope: CancellationScope | null;
  isThirdPartyRequest: boolean;
  referredPersonName: string | null;
  referredPersonPhone: string | null;
  referredByName: string | null;
  referredByContact: string | null;
  urgency: Urgency;
  contactActionType: ContactActionType | null;
  requestedDateTimeText: string | null;
  requestedNewDateText: string | null;
  proposedMoveToText: string | null;
  requestedStartsAt: string | null;
  requestedEndsAt: string | null;
  reason: string | null;
  needsCalendarCheck: boolean;
  conflictDetected: boolean;
  alternatives: AvailabilitySlot[];
  suggestedReply: string;
  needsMoreInfo: boolean;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  missingFields: string[];
  recommendedNextStep: RecommendedNextStep;
  safetyNotes: string[];
  demoSuggestedAction: SuggestedActionType;
  aiProvider: "openai" | "heuristic";
  aiModel: string | null;
  usedFallback: boolean;
};

type DemoCalendarResult = {
  requestedDateTimeText: string | null;
  requestedStartsAt: string | null;
  requestedEndsAt: string | null;
  needsCalendarCheck: boolean;
  conflictDetected: boolean;
  alternatives: AvailabilitySlot[];
  scenario: DemoCalendarScenario;
};

type DemoCalendarScenario =
  | "reschedule_day_after_tomorrow"
  | "tomorrow_afternoon"
  | "tomorrow_morning"
  | "tomorrow"
  | "tomorrow_15"
  | "thursday_15"
  | "reschedule_tomorrow"
  | "reschedule_generic"
  | "next_week"
  | "generic_appointment"
  | "urgent_first_available"
  | "appointment_lookup"
  | "none";

type DemoContact = {
  name: string;
  firstName: string;
  whatsapp: string | null;
  email: string | null;
};

type DemoAppointment = {
  title: string;
  customerName: string;
  day: "tomorrow" | "thursday" | "next_tuesday";
  hour: number;
  minute: number;
  reason: string;
  reasonEn: string;
};

type DemoRequestedDateKind =
  | "day_after_tomorrow"
  | "tomorrow"
  | "today"
  | "friday"
  | "thursday"
  | "next_week"
  | "unknown";

type ThirdPartyRequestContext = {
  isThirdPartyRequest: boolean;
  referredPersonName: string | null;
  referredPersonPhone: string | null;
  referredByName: string | null;
  referredByContact: string | null;
  urgency: Urgency;
  reason: string | null;
  missingFields: string[];
  clarificationQuestion: string | null;
  contactActionType: ContactActionType | null;
};

type CancellationContext = {
  isCancellationRequest: boolean;
  scope: CancellationScope;
  linkedAppointments: LinkedAppointment[];
  reasonText: string | null;
};

type SenderIdentity = {
  senderText: string;
  senderName: string | null;
  senderContact: string | null;
  senderSource: DemoPlaygroundChannel;
  customerIdentified: boolean;
  contact: DemoContact | null;
};

const demoContacts: DemoContact[] = [
  {
    name: "Mario Rossi",
    firstName: "Mario",
    whatsapp: "+39 333 1234567",
    email: "mario.rossi@example.com",
  },
  {
    name: "Laura Bianchi",
    firstName: "Laura",
    whatsapp: "+39 333 7654321",
    email: "laura.bianchi@example.com",
  },
  {
    name: "Studio Verdi",
    firstName: "Studio",
    whatsapp: null,
    email: "studio.verdi@example.com",
  },
];

const demoAppointments: DemoAppointment[] = [
  {
    title: "Preventivo Mario Rossi",
    customerName: "Mario Rossi",
    day: "thursday",
    hour: 15,
    minute: 0,
    reason: "preventivo",
    reasonEn: "quote",
  },
  {
    title: "Consulenza Laura Bianchi",
    customerName: "Laura Bianchi",
    day: "tomorrow",
    hour: 15,
    minute: 0,
    reason: "consulenza",
    reasonEn: "consultation",
  },
  {
    title: "Incontro operativo Studio Verdi",
    customerName: "Studio Verdi",
    day: "next_tuesday",
    hour: 10,
    minute: 0,
    reason: "incontro operativo",
    reasonEn: "operational meeting",
  },
];

const requestSchema = z.object({
  channel: z.enum(["email", "whatsapp", "quick_call"]),
  senderText: z.string().trim().max(300).optional().default(""),
  customerText: z.string().trim().min(1).max(2000),
  locale: z.enum(["it", "en"]).default("it"),
});

const matchedAppointmentSchema = z.object({
  found: z.boolean(),
  title: z.string().nullable(),
  customerName: z.string().nullable(),
  startsAtText: z.string().nullable(),
  reason: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const appointmentRequestSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum([
    "new_appointment",
    "reschedule_existing",
    "delay_existing",
    "lookup_existing",
    "callback_request",
    "generic_request",
    "unknown",
  ]),
  summary: z.string().trim().min(1).max(300),
  requestedDateTimeText: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(1).max(200),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().trim().nullable().optional(),
  alternatives: z.array(z.string().trim().min(1).max(120)).max(4),
});

const linkedAppointmentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  startsAtText: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(120),
});

const openAIAnalysisSchema = z.object({
  detectedIntent: z.enum([
    "new_appointment",
    "reschedule_appointment",
    "delay_notice",
    "cancel_appointment",
    "appointment_lookup",
    "callback_request",
    "manual_review",
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(1).max(500),
  appointmentRequests: z.array(appointmentRequestSchema).max(5).optional(),
  hasMultipleRequests: z.boolean().optional(),
  primaryRequestSummary: z.string().trim().nullable().optional(),
  linkedAppointments: z.array(linkedAppointmentSchema).max(8).optional(),
  hasLinkedAppointments: z.boolean().optional(),
  cancellationScope: z.enum(["all_future", "single_or_unspecified"]).nullable().optional(),
  isThirdPartyRequest: z.boolean().optional(),
  referredPersonName: z.string().trim().nullable().optional(),
  referredPersonPhone: z.string().trim().nullable().optional(),
  referredByName: z.string().trim().nullable().optional(),
  referredByContact: z.string().trim().nullable().optional(),
  urgency: z.enum(["normal", "urgent"]).optional(),
  contactActionType: z.enum([
    "ask_sender_clarification",
    "prepare_message_to_referred_person",
    "manual_review",
  ]).nullable().optional(),
  requestedDateTimeText: z.string().trim().nullable().optional(),
  requestedNewDateText: z.string().trim().nullable().optional(),
  proposedMoveToText: z.string().trim().nullable().optional(),
  requestedStartsAt: z.string().trim().nullable().optional(),
  requestedEndsAt: z.string().trim().nullable().optional(),
  reason: z.string().trim().nullable().optional(),
  needsCalendarCheck: z.boolean().optional(),
  suggestedReply: z.string().trim().min(1).max(1200),
  senderName: z.string().trim().nullable().optional(),
  senderContact: z.string().trim().nullable().optional(),
  customerIdentified: z.boolean().optional(),
  appointmentContextType: z.enum([
    "new_appointment",
    "reschedule_existing",
    "delay_existing",
    "cancel_existing",
    "lookup_existing",
    "callback_request",
    "generic_request",
    "unknown",
  ]).optional(),
  matchedAppointment: matchedAppointmentSchema.optional(),
  needsClarification: z.boolean().optional(),
  clarificationQuestion: z.string().trim().nullable().optional(),
  recommendedNextStep: z.enum([
    "ask_clarification",
    "propose_slots",
    "propose_reschedule",
    "approve_reply",
    "manual_review",
  ]).optional(),
  missingFields: z.array(z.string().trim()).max(8).optional(),
  safetyNotes: z.array(z.string().trim()).max(8).optional(),
});

const DEMO_SYSTEM_PROMPT = [
  "You are Soreya, an AI secretary for email, WhatsApp and calendar.",
  "Analyze a safe sandbox demo request. Consider senderText as sender metadata.",
  "Do not invent customer names, contacts or missing new-appointment reasons.",
  "Classify as appointment request, appointment lookup/reminder, reschedule request, delay notice, callback request or generic/manual review.",
  "If the customer asks Soreya to remind/check/look up when an existing appointment is scheduled, classify as appointment_lookup with appointmentContextType=lookup_existing.",
  "Appointment lookup examples include: non ricordo quando ho l'appuntamento, non mi ricordo quando ho l'appuntamento, mi ricordi l'appuntamento, mi ricordi quando, quando ho appuntamento, quando ho l'appuntamento, riesci a guardare, puoi controllare, quando ci vediamo, a che ora ho l'appuntamento, che giorno ho l'appuntamento, when is my appointment, can you remind me when my appointment is, what time is my appointment, can you check my appointment, when are we meeting.",
  "For appointment lookup demo requests, assume a linked demo appointment exists for the sender, set matchedAppointment.found=true, needsCalendarCheck=true, needsClarification=false, recommendedNextStep=approve_reply.",
  "For appointment lookup demo requests, do not treat the message as a new appointment request, do not ask for the appointment reason, do not say you lack calendar access, and do not say a reminder was sent.",
  "'Prima disponibilità utile', 'prima disponibilità', 'first available slot' and 'earliest availability' mean the customer is asking for the first available slot.",
  "Recognize appointment reasons/services including carie, cavity, toothache, pain, dolore, urgenza, urgent, emergenza, emergency, controllo, check-up, preventivo, quote, consulenza, consultation, igiene dentale, dental cleaning and visita.",
  "If the text contains carie or cavity, set the reason to 'urgenza per carie' in Italian or 'urgent cavity-related appointment' in English.",
  "If an urgent request includes a reason, do not ask for the reason; set urgency=urgent, detectedIntent=new_appointment, appointmentContextType=new_appointment, needsClarification=false and recommendedNextStep=propose_slots.",
  "For urgent or earliest-availability demo requests with a reason, propose fast concrete slots: today at 4:30 PM and tomorrow at 9:30 AM.",
  "If a new appointment request says only tomorrow and includes a reason, treat the date as present and propose tomorrow at 9:30 AM and 11:00 AM.",
  "If it says tomorrow morning, propose tomorrow at 9:30 AM and 11:00 AM; if it says tomorrow afternoon, propose tomorrow at 4:30 PM and 5:15 PM.",
  "If the new appointment reason/service is missing, ask a clarification question instead of proposing slots.",
  "If the customer asks to cancel, annul, delete or disdire appointments, classify as cancel_appointment.",
  "If a cancellation request says all appointments, treat it as all future appointments linked to the sender.",
  "For cancellation demo requests, assume linked demo appointments exist and include linkedAppointments.",
  "For cancellation demo requests, do not say no appointments were found, do not modify a calendar, and prepare only an approval-first draft.",
  "If a cancellation reason is present, do not ask for more details.",
  "If the customer asks for multiple appointments, do not reduce the request to one appointment.",
  "For multiple appointments, extract each separate appointment with date/time window, reason and alternatives in appointmentRequests.",
  "For multiple appointments, set hasMultipleRequests=true, primaryRequestSummary to a concise combined summary, and generate one suggestedReply covering every appointment.",
  "If only one appointment in a multi-appointment request is missing information, ask clarification only for that specific appointment.",
  "If the sender asks Soreya to contact another person for an appointment, classify it as a third-party/referral appointment, not as the sender's own appointment.",
  "For third-party appointment requests, extract the referred person's name and phone, the sender/referrer, urgency, appointment reason, and contactActionType.",
  "For third-party appointment requests, the primary suggestedReply must be addressed to the referred person, not to the sender.",
  "Do not reply to the sender with 'I can prepare a message' as the primary draft when the sender asked to contact someone else.",
  "If a third-party request is missing the appointment reason, ask the referred person for that reason in the draft.",
  "If a third-party request includes the reason, propose slots to the referred person and keep it approval-first.",
  "For plausible rescheduling demo requests, assume a linked demo appointment even when the sender is generic.",
  "For rescheduling demo requests, never say that no appointment was found and never say you cannot access the calendar.",
  "For rescheduling demo requests, set appointmentContextType=reschedule_existing, matchedAppointment.found=true, needsClarification=false, recommendedNextStep=propose_reschedule.",
  "For rescheduling demo requests, generate a coherent demo appointment context and exactly two concrete alternative slots.",
  "Respect relative dates expressed by the customer: 'dopo domani' and 'dopodomani' mean day after tomorrow, not tomorrow.",
  "If the customer proposes a new target date, keep proposed slots on that date first and do not suggest an earlier or different first alternative without a reason.",
  "Do not say the appointment is being moved to tomorrow when the customer asks to move it to the day after tomorrow.",
  "Use these rescheduling demo rules: Thursday 3 PM moves to Friday 9:30 AM or Friday 11:00 AM; tomorrow moves to tomorrow 4:30 PM or Friday 9:30 AM; otherwise today 3 PM moves to tomorrow 4:30 PM or Friday 11:00 AM.",
  "For rescheduling to day after tomorrow, set requestedDateTimeText, requestedNewDateText and proposedMoveToText to day after tomorrow, and propose day after tomorrow at 9:30 AM and 11:00 AM.",
  "If the text contains 'sono in ritardo', 'ritardo di X minuti', 'running late', 'late by X minutes', 'possiamo piu tardi', 'possiamo più tardi', or 'can we talk later', classify it as delay_notice.",
  "For delay_notice, do not propose standard future calendar slots. Suggest a nearby time such as in about an hour, later today, or when the customer is free.",
  "Never say that you sent a message.",
  "Never say that you created, changed or deleted a calendar event.",
  "Use the requested locale for every user-visible field.",
  "Return only valid JSON. Do not include markdown.",
].join("\n");

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, { route: "/api/demo/analyze-request", limit: 30 });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = requestSchema.parse(await request.json());
    const fallback = buildFallbackAnalysis(body);

    if (shouldUseDeterministicDemoAnalysis()) {
      return Response.json({
        ...fallback,
        aiProvider: "heuristic",
        aiModel: null,
        usedFallback: true,
      } satisfies DemoAnalyzeResponse);
    }

    const aiResult = await callOpenAIJson({
      systemPrompt: DEMO_SYSTEM_PROMPT,
      schema: openAIAnalysisSchema,
      temperature: 0.2,
      userPrompt: JSON.stringify({
        task: "Analyze this Soreya demo playground request and generate a safe reply draft.",
        channel: body.channel,
        senderText: body.senderText,
        locale: body.locale,
        customerText: body.customerText,
        today: dateKey(new Date()),
        demoContacts,
        demoAppointments: demoAppointments.map((appointment) => ({
          ...appointment,
          startsAtText: formatAppointmentStartsAt(appointment, body.locale),
        })),
        demoCalendarFacts: [
          "Tomorrow at 15:00 is busy.",
          "Tomorrow afternoon available slots are 16:30 and 17:15.",
          "Thursday at 15:00 is busy.",
          "Friday morning available slots are 9:30 and 11:00.",
          "Next week morning available slots are Tuesday 10:00 and Wednesday 9:30.",
        ],
        deterministicFallback: fallback,
        requiredOutput: {
          senderName: "string or null; do not invent if not present",
          senderContact: "string or null",
          customerIdentified: "boolean",
          hasMultipleRequests: "boolean",
          primaryRequestSummary: "string or null",
          appointmentRequests:
            "array of separate appointment requests with id/type/summary/requestedDateTimeText/reason/needsClarification/clarificationQuestion/alternatives",
          linkedAppointments: "array of linked demo appointments for cancellation requests",
          hasLinkedAppointments: "boolean",
          cancellationScope: "all_future | single_or_unspecified | null",
          isThirdPartyRequest: "boolean",
          referredPersonName: "string or null",
          referredPersonPhone: "string or null",
          referredByName: "string or null",
          referredByContact: "string or null",
          urgency: "normal | urgent",
          contactActionType:
            "ask_sender_clarification | prepare_message_to_referred_person | manual_review | null",
          appointmentContextType:
            "new_appointment | reschedule_existing | delay_existing | lookup_existing | callback_request | generic_request | unknown",
          matchedAppointment: "object with found/title/customerName/startsAtText/reason/confidence; found must be true for plausible reschedule and appointment_lookup demo requests",
          requestedNewDateText: "string or null; target date requested by the customer for reschedules",
          proposedMoveToText: "string or null; same target date phrased for UI",
          reason: "string or null; extracted appointment reason/service when present",
          needsClarification: "boolean",
          clarificationQuestion: "question if missing info, else null",
          recommendedNextStep:
            "ask_clarification | propose_slots | propose_reschedule | approve_reply | manual_review",
          suggestedReply: "brief human draft, never claims execution",
        },
      }),
    });

    if (!aiResult.data) {
      return Response.json({
        ...fallback,
        aiProvider: "heuristic",
        aiModel: aiResult.aiModel ?? readOpenAIConfig().model,
        usedFallback: true,
      } satisfies DemoAnalyzeResponse);
    }

    return Response.json(mergeOpenAIAnalysis(fallback, aiResult.data, {
      aiModel: aiResult.aiModel,
      aiProvider: aiResult.aiProvider,
      usedFallback: aiResult.usedFallback,
    }));
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to analyze demo request.",
      },
      { status: 400 },
    );
  }
}

function mergeOpenAIAnalysis(
  fallback: DemoAnalyzeResponse,
  ai: z.infer<typeof openAIAnalysisSchema>,
  metadata: { aiProvider: "openai" | "heuristic"; aiModel: string | null; usedFallback: boolean },
): DemoAnalyzeResponse {
  const protectedFallback =
    fallback.needsClarification ||
    fallback.isThirdPartyRequest ||
    fallback.detectedIntent === "cancel_appointment" ||
    fallback.detectedIntent === "delay_notice" ||
    fallback.detectedIntent === "appointment_lookup" ||
    fallback.detectedIntent === "reschedule_appointment" ||
    fallback.recommendedNextStep === "propose_slots";

  return {
    ...fallback,
    confidence: Math.max(fallback.confidence, ai.confidence),
    summary: protectedFallback ? fallback.summary : ai.summary || fallback.summary,
    appointmentRequests: protectedFallback
      ? fallback.appointmentRequests
      : normalizeAiAppointmentRequests(ai.appointmentRequests) ?? fallback.appointmentRequests,
    hasMultipleRequests: protectedFallback
      ? fallback.hasMultipleRequests
      : ai.hasMultipleRequests ?? fallback.hasMultipleRequests,
    primaryRequestSummary: protectedFallback
      ? fallback.primaryRequestSummary
      : ai.primaryRequestSummary || fallback.primaryRequestSummary,
    linkedAppointments: protectedFallback
      ? fallback.linkedAppointments
      : normalizeAiLinkedAppointments(ai.linkedAppointments) ?? fallback.linkedAppointments,
    hasLinkedAppointments: protectedFallback
      ? fallback.hasLinkedAppointments
      : ai.hasLinkedAppointments ?? fallback.hasLinkedAppointments,
    cancellationScope: protectedFallback
      ? fallback.cancellationScope
      : ai.cancellationScope ?? fallback.cancellationScope,
    isThirdPartyRequest: protectedFallback
      ? fallback.isThirdPartyRequest
      : ai.isThirdPartyRequest ?? fallback.isThirdPartyRequest,
    referredPersonName: protectedFallback
      ? fallback.referredPersonName
      : ai.referredPersonName ?? fallback.referredPersonName,
    referredPersonPhone: protectedFallback
      ? fallback.referredPersonPhone
      : ai.referredPersonPhone ?? fallback.referredPersonPhone,
    referredByName: protectedFallback
      ? fallback.referredByName
      : ai.referredByName ?? fallback.referredByName,
    referredByContact: protectedFallback
      ? fallback.referredByContact
      : ai.referredByContact ?? fallback.referredByContact,
    urgency: protectedFallback
      ? fallback.urgency
      : ai.urgency ?? fallback.urgency,
    contactActionType: protectedFallback
      ? fallback.contactActionType
      : ai.contactActionType ?? fallback.contactActionType,
    suggestedReply: protectedFallback ? fallback.suggestedReply : ai.suggestedReply || fallback.suggestedReply,
    safetyNotes: buildSafetyNotes(fallback.locale),
    aiProvider: metadata.aiProvider,
    aiModel: metadata.aiModel,
    usedFallback: metadata.usedFallback,
  };
}

function normalizeAiAppointmentRequests(requests: z.infer<typeof appointmentRequestSchema>[] | undefined) {
  if (!requests || requests.length === 0) {
    return null;
  }

  return requests.map((request) => ({
    ...request,
    clarificationQuestion: request.clarificationQuestion ?? null,
  }));
}

function normalizeAiLinkedAppointments(appointments: z.infer<typeof linkedAppointmentSchema>[] | undefined) {
  return appointments && appointments.length > 0 ? appointments : null;
}

function shouldUseDeterministicDemoAnalysis() {
  return !readOpenAIConfig().apiKey;
}

function buildFallbackAnalysis(input: z.infer<typeof requestSchema>): DemoAnalyzeResponse {
  const locale = resolveLocale(input.locale);
  const sender = resolveSenderIdentity(input.channel, input.senderText, input.customerText, locale);
  const multipleAppointmentRequests = buildMultipleAppointmentRequests(input.customerText, locale);
  const hasMultipleRequests = multipleAppointmentRequests.length > 1;
  const thirdParty = buildThirdPartyRequestContext(input.customerText, locale, sender);
  const isThirdPartyRequest = thirdParty.isThirdPartyRequest;
  const cancellation = buildCancellationContext(input.customerText, locale, sender);
  const isCancellationRequest = cancellation.isCancellationRequest;
  const detectedIntent = isCancellationRequest
    ? "cancel_appointment"
    : hasMultipleRequests || isThirdPartyRequest ? "new_appointment" : detectIntent(input.customerText);
  const reason = thirdParty.reason ?? detectAppointmentReason(input.customerText, locale);
  const requestUrgency = isThirdPartyRequest ? thirdParty.urgency : detectRequestUrgency(input.customerText);
  const calendar = isCancellationRequest
    ? calendarFromCancellation(cancellation, locale)
    : isThirdPartyRequest
    ? calendarFromThirdPartyRequest(thirdParty, locale)
    : hasMultipleRequests
    ? calendarFromMultipleAppointmentRequests(multipleAppointmentRequests)
    : resolveDemoCalendar(input.customerText, detectedIntent, locale, reason);
  const matchedAppointment = matchAppointment(sender, input.customerText, detectedIntent, locale);
  const requestedNewDateText = resolveRequestedNewDateText(input.customerText, detectedIntent, calendar, locale);
  const proposedMoveToText = requestedNewDateText;
  const appointmentContextType = resolveAppointmentContextType(detectedIntent);
  const clarification = resolveClarification({
    locale,
    intent: detectedIntent,
    reason,
    sender,
    matchedAppointment,
    calendar,
    customerText: input.customerText,
  });
  const recommendedNextStep = isThirdPartyRequest
    ? thirdParty.missingFields.length > 0 ? "ask_clarification" : "approve_reply"
    : isCancellationRequest
      ? "approve_reply"
    : resolveRecommendedNextStep({
    intent: detectedIntent,
    reason,
    clarificationQuestion: clarification.question,
    matchedAppointment,
  });
  const needsClarification = recommendedNextStep === "ask_clarification";
  const missingFields = isThirdPartyRequest
    ? thirdParty.missingFields
    : isCancellationRequest
      ? []
    : buildMissingFields({
    locale,
    intent: detectedIntent,
    reason,
    sender,
    matchedAppointment,
    calendar,
    clarificationQuestion: clarification.question,
  });
  const primaryRequestSummary = hasMultipleRequests
    ? buildMultipleAppointmentPrimarySummary(multipleAppointmentRequests, locale)
    : "";
  const summary = isThirdPartyRequest
    ? buildThirdPartySummary(thirdParty, locale)
    : isCancellationRequest
      ? buildCancellationSummary(cancellation, sender, locale)
    : hasMultipleRequests
    ? buildMultipleAppointmentSummary(multipleAppointmentRequests, locale)
    : buildSummary({
    locale,
    intent: detectedIntent,
    calendar,
    customerText: input.customerText,
    reason,
    sender,
    matchedAppointment,
    requestedNewDateText,
    recommendedNextStep,
    urgency: requestUrgency,
  });
  const suggestedReply = isThirdPartyRequest
    ? buildThirdPartySuggestedReply(thirdParty, locale)
    : isCancellationRequest
      ? buildCancellationSuggestedReply(cancellation, sender, locale)
    : hasMultipleRequests
    ? buildMultipleAppointmentSuggestedReply(multipleAppointmentRequests, locale, sender)
    : buildSuggestedReply({
    locale,
    intent: detectedIntent,
    calendar,
    reason,
    sender,
    matchedAppointment,
    requestedNewDateText,
    clarificationQuestion: clarification.question,
    recommendedNextStep,
    urgency: requestUrgency,
  });

  return {
    channel: input.channel,
    senderText: sender.senderText,
    customerText: input.customerText,
    locale,
    detectedIntent,
    isAppointmentRequest: detectedIntent === "new_appointment" || detectedIntent === "reschedule_appointment" || detectedIntent === "cancel_appointment" || detectedIntent === "appointment_lookup",
    confidence: isThirdPartyRequest
      ? thirdParty.missingFields.length > 0 ? 0.93 : 0.95
      : isCancellationRequest
        ? 0.96
      : hasMultipleRequests
      ? 0.96
      : calculateFallbackConfidence(input.customerText, detectedIntent, calendar, sender, matchedAppointment, reason),
    customerName: isThirdPartyRequest
      ? thirdParty.referredPersonName
      : sender.customerIdentified
      ? sender.contact?.name ?? sender.senderName
      : detectedIntent === "reschedule_appointment" || detectedIntent === "appointment_lookup"
        ? matchedAppointment.customerName
        : null,
    senderName: sender.senderName,
    senderContact: sender.senderContact,
    senderSource: input.channel,
    customerIdentified: sender.customerIdentified,
    appointmentContextType,
    matchedAppointment,
    summary,
    appointmentRequests: multipleAppointmentRequests.map(toDemoAppointmentRequest),
    hasMultipleRequests,
    primaryRequestSummary,
    linkedAppointments: cancellation.linkedAppointments,
    hasLinkedAppointments: cancellation.linkedAppointments.length > 0,
    cancellationScope: isCancellationRequest ? cancellation.scope : null,
    isThirdPartyRequest,
    referredPersonName: thirdParty.referredPersonName,
    referredPersonPhone: thirdParty.referredPersonPhone,
    referredByName: thirdParty.referredByName,
    referredByContact: thirdParty.referredByContact,
    urgency: requestUrgency,
    contactActionType: thirdParty.contactActionType,
    requestedDateTimeText: calendar.requestedDateTimeText,
    requestedNewDateText,
    proposedMoveToText,
    requestedStartsAt: calendar.requestedStartsAt,
    requestedEndsAt: calendar.requestedEndsAt,
    reason,
    needsCalendarCheck: calendar.needsCalendarCheck,
    conflictDetected: calendar.conflictDetected,
    alternatives: calendar.alternatives,
    suggestedReply,
    needsMoreInfo: isThirdPartyRequest ? thirdParty.missingFields.length > 0 : hasMultipleRequests ? multipleAppointmentRequests.some((request) => request.needsClarification) : missingFields.length > 0,
    needsClarification: isThirdPartyRequest ? thirdParty.missingFields.length > 0 : hasMultipleRequests ? multipleAppointmentRequests.some((request) => request.needsClarification) : needsClarification,
    clarificationQuestion: isThirdPartyRequest ? thirdParty.clarificationQuestion : clarification.question,
    missingFields,
    recommendedNextStep: hasMultipleRequests && multipleAppointmentRequests.some((request) => request.needsClarification)
      ? "ask_clarification"
      : recommendedNextStep,
    safetyNotes: buildSafetyNotes(locale),
    demoSuggestedAction: selectSuggestedAction(input.channel, detectedIntent, missingFields.length > 0),
    aiProvider: "heuristic",
    aiModel: readOpenAIConfig().model,
    usedFallback: true,
  };
}

function resolveSenderIdentity(
  channel: DemoPlaygroundChannel,
  senderTextInput: string,
  customerText: string,
  locale: SupportedLocale,
): SenderIdentity {
  const senderText = senderTextInput.trim() || defaultSender(channel, locale);
  const parsedContact = extractContact(senderText);
  const textName = extractNameFromCustomerText(customerText);
  const parsedName = cleanSenderName(senderText, parsedContact);
  const contact = matchDemoContact({
    senderName: parsedName,
    senderContact: parsedContact,
    textName,
  });
  const senderName = contact?.name ?? textName ?? parsedName;
  const isDefault = senderText === defaultSender(channel, locale);

  return {
    senderText,
    senderName: senderName || null,
    senderContact: parsedContact,
    senderSource: channel,
    customerIdentified: Boolean(contact || textName || (!isDefault && parsedName)),
    contact,
  };
}

function defaultSender(channel: DemoPlaygroundChannel, locale: SupportedLocale) {
  if (locale === "en") {
    if (channel === "whatsapp") {
      return "WhatsApp customer";
    }

    if (channel === "quick_call") {
      return "Phone call customer";
    }

    return "Email customer";
  }

  if (channel === "whatsapp") {
    return "Cliente WhatsApp";
  }

  if (channel === "quick_call") {
    return "Cliente da telefonata";
  }

  return "Cliente email";
}

function extractContact(senderText: string) {
  const email = senderText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;

  if (email) {
    return email.toLowerCase();
  }

  const phone = senderText.match(/\+?\d[\d\s().-]{6,}\d/)?.[0] ?? null;
  return phone ? normalizePhone(phone) : null;
}

function cleanSenderName(senderText: string, contact: string | null) {
  let value = senderText
    .replace(/<[^>]+>/g, "")
    .split("·")[0]
    .trim();

  if (contact) {
    value = value.replace(contact, "").replace(normalizePhone(contact), "").trim();
  }

  value = value
    .replace(/\+?\d[\d\s().-]{5,}\d/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return value ? toDisplayName(value) : null;
}

function extractNameFromCustomerText(text: string) {
  const normalized = text.replace(/[’‘]/g, "'");
  const match = normalized.match(/\b(?:sono|ciao sono|mi chiamo|this is|i am|i'm|my name is)\s+([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ']+(?:\s+[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ']+)?)\b/);
  return match?.[1] ?? null;
}

function matchDemoContact(input: {
  senderName: string | null;
  senderContact: string | null;
  textName: string | null;
}) {
  const normalizedName = normalizeText([input.senderName, input.textName].filter(Boolean).join(" "));
  const normalizedContact = input.senderContact ? normalizeContact(input.senderContact) : null;

  return demoContacts.find((contact) => {
    const contactName = normalizeText(contact.name);
    const firstName = normalizeText(contact.firstName);
    const email = contact.email ? normalizeContact(contact.email) : null;
    const whatsapp = contact.whatsapp ? normalizeContact(contact.whatsapp) : null;

    return Boolean(
      (normalizedContact && (normalizedContact === email || normalizedContact === whatsapp)) ||
      (normalizedName && (normalizedName.includes(contactName) || normalizedName.includes(firstName))),
    );
  }) ?? null;
}

function detectIntent(text: string): DemoDetectedIntent {
  const normalized = normalizeText(text);

  if (!normalized) {
    return "manual_review";
  }

  if (isCancellationText(normalized)) {
    return "cancel_appointment";
  }

  if (isDelayNoticeText(normalized)) {
    return "delay_notice";
  }

  if (/(richiam|chiamami|mi richiami|call me back|call back|callback|phone me)/.test(normalized)) {
    return "callback_request";
  }

  if (/(spost|spostiamo|rimand|rinvia|posticip|anticip|riprogram|cambiare appuntamento|cambio appuntamento|resched|postpone|move appointment|move our meeting|change the appointment|\bmove\b|\bchange\b)/.test(normalized)) {
    return "reschedule_appointment";
  }

  if (isAppointmentLookupText(normalized)) {
    return "appointment_lookup";
  }

  if (
    /\b(disponibilita|available|availability|appuntamento|preventivo|igiene dentale|pulizia dentale|consulenza|controllo|visita|sopralluogo|passare|fissare|prenotare|carie|dolore|urgenza|urgente|emergenza|appointment|quote|dental cleaning|consultation|check|check-up|book|schedule|visit|come|cavity|toothache|pain|urgent|emergency)\b/.test(normalized)
  ) {
    return "new_appointment";
  }

  return "manual_review";
}

function isAppointmentLookupText(normalizedText: string) {
  return /(?:non\s+(?:mi\s+)?ricordo\s+(?:piu\s+)?quando\s+ho\s+l?'?appuntamento|mi\s+ricordi\s+(?:l?'?appuntamento|quando|a\s+che\s+ora)|quando\s+ho\s+(?:l?'?appuntamento|appuntamento)|(?:riesci\s+a\s+guardare|puoi\s+controllare).*appuntamento|appuntamento.*(?:riesci\s+a\s+guardare|puoi\s+controllare)|quando\s+ci\s+vediamo|a\s+che\s+ora\s+ho\s+l?'?appuntamento|che\s+giorno\s+ho\s+l?'?appuntamento|when\s+is\s+my\s+appointment|what\s+time\s+is\s+my\s+appointment|can\s+you\s+remind\s+me\s+when\s+my\s+appointment\s+is|remind\s+me\s+when\s+my\s+appointment\s+is|i\s+don'?t\s+remember\s+my\s+appointment|can\s+you\s+check\s+my\s+appointment|when\s+are\s+we\s+meeting)/.test(normalizedText);
}

function isDelayNoticeText(normalizedText: string) {
  return /(?:\bsono\s+in\s+ritardo\b|\britardo(?:\s+di\s+\d+\s+minuti)?\b|blocc(?:ato|ata|ati|ate)?\s+(?:nel|in)\s+traffico|\btraffico\b|riesci\s+a\s+sentir(?:mi|ci)\s+piu\s+tardi|possiamo\s+sentirci\s+piu\s+tardi|sentirci\s+piu\s+tardi|chiamarci\s+piu\s+tardi|sentirci\s+dopo|tra un'ora|fra un'ora|stuck in traffic|running late|can we talk later|can we speak later|talk later|speak later|\bi'?m late\b|\bi am late\b|\blate\b|\bdelay\b|delayed|in an hour)/.test(normalizedText);
}

function detectAppointmentReason(text: string, locale: SupportedLocale) {
  const normalized = normalizeText(text);

  if (/\b(carie|cavity)\b/.test(normalized)) {
    return locale === "it" ? "urgenza per carie" : "urgent cavity-related appointment";
  }

  if (/\b(mal di denti|dolore ai denti|dolore|toothache|tooth pain|pain)\b/.test(normalized)) {
    return locale === "it" ? "urgenza per dolore ai denti" : "urgent tooth pain appointment";
  }

  const reasons = locale === "it"
    ? [
        { key: "preventivo", patterns: ["preventivo", "quote"] },
        { key: "igiene dentale", patterns: ["igiene dentale", "pulizia dentale", "dental cleaning"] },
        { key: "consulenza", patterns: ["consulenza", "consultation"] },
        { key: "controllo", patterns: ["controllo", "check"] },
        { key: "visita", patterns: ["visita", "visit"] },
        { key: "sopralluogo", patterns: ["sopralluogo", "visit"] },
      ]
    : [
        { key: "quote", patterns: ["quote", "estimate", "preventivo"] },
        { key: "dental cleaning", patterns: ["dental cleaning", "igiene dentale", "pulizia dentale"] },
        { key: "consultation", patterns: ["consultation", "consulenza"] },
        { key: "check-up", patterns: ["check-up", "checkup", "check", "control", "controllo"] },
        { key: "visit", patterns: ["visit", "visita"] },
        { key: "visit", patterns: ["visit", "sopralluogo"] },
      ];

  const detectedReason = reasons.find((reason) => reason.patterns.some((pattern) => normalized.includes(pattern)))?.key ?? null;

  if (detectedReason) {
    return detectedReason;
  }

  if (/\b(appuntamento urgente|urgenza|urgente|emergenza|urgent appointment|urgent|emergency)\b/.test(normalized)) {
    return locale === "it" ? "appuntamento urgente" : "urgent appointment";
  }

  if (hasFirstAvailabilitySignal(normalized)) {
    return locale === "it" ? "prima disponibilità utile" : "first available slot";
  }

  return null;
}

function detectRequestUrgency(text: string): Urgency {
  const normalized = normalizeText(text);
  return /(?:\burgenza\b|\burgente\b|\bemergenza\b|\bappuntamento urgente\b|\burgent\b|\bemergency\b|first available|earliest availability|prima disponibilita(?: utile)?)/.test(normalized)
    ? "urgent"
    : "normal";
}

function hasFirstAvailabilitySignal(normalizedText: string) {
  return /(?:prima disponibilita(?: utile)?|first available(?: slot)?|earliest availability)/.test(normalizedText);
}

function resolveDemoCalendar(
  text: string,
  intent: DemoDetectedIntent,
  locale: SupportedLocale,
  reason: string | null,
): DemoCalendarResult {
  if (intent === "cancel_appointment") {
    return {
      requestedDateTimeText: detectCancellationScope(normalizeText(text)) === "all_future"
        ? locale === "it" ? "tutti gli appuntamenti futuri" : "all future appointments"
        : detectRequestedDateTimeText(text, locale) ?? (locale === "it" ? "appuntamento da annullare" : "appointment to cancel"),
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [],
      scenario: "none",
    };
  }

  if (intent === "appointment_lookup") {
    return {
      requestedDateTimeText: locale === "it" ? "appuntamento esistente" : "existing appointment",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [],
      scenario: "appointment_lookup",
    };
  }

  if (intent === "delay_notice" || intent === "callback_request" || intent === "manual_review") {
    return emptyCalendar(hasTomorrow(normalizeText(text)) ? locale === "it" ? "domani" : "tomorrow" : null);
  }

  const normalized = normalizeText(text);
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const dayAfterTomorrow = addDays(now, 2);
  const friday = nextWeekday(now, 5);
  const nextMonday = nextWeekStart(now);
  const nextTuesday = addDays(nextMonday, 1);
  const nextWednesday = addDays(nextMonday, 2);

  if (intent === "reschedule_appointment") {
    return resolveDemoRescheduleCalendar(normalized, locale, now, tomorrow, dayAfterTomorrow, friday);
  }

  if (intent === "new_appointment" && reason && detectRequestUrgency(text) === "urgent") {
    return {
      requestedDateTimeText: hasFirstAvailabilitySignal(normalized)
        ? locale === "it" ? "prima disponibilità utile" : "first available slot"
        : locale === "it" ? "appuntamento urgente" : "urgent appointment",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [toSlot(now, 16, 30), toSlot(tomorrow, 9, 30)],
      scenario: "urgent_first_available",
    };
  }

  if (intent === "new_appointment" && !reason) {
    const requested = detectRequestedDateTimeText(text, locale);
    return {
      ...emptyCalendar(requested),
      scenario: "none",
    };
  }

  if (hasDayAfterTomorrow(normalized)) {
    return {
      requestedDateTimeText: locale === "it" ? "dopodomani" : "day after tomorrow",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [toSlot(dayAfterTomorrow, 9, 30), toSlot(dayAfterTomorrow, 11, 0)],
      scenario: "generic_appointment",
    };
  }

  if (hasTomorrow(normalized) && hasAfternoon(normalized)) {
    return {
      requestedDateTimeText: locale === "it" ? "domani pomeriggio" : "tomorrow afternoon",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [toSlot(tomorrow, 16, 30), toSlot(tomorrow, 17, 15)],
      scenario: "tomorrow_afternoon",
    };
  }

  if (hasTomorrow(normalized) && hasMorning(normalized)) {
    return {
      requestedDateTimeText: locale === "it" ? "domani mattina" : "tomorrow morning",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [toSlot(tomorrow, 9, 30), toSlot(tomorrow, 11, 0)],
      scenario: "tomorrow_morning",
    };
  }

  if (hasTomorrow(normalized) && hasThreePm(normalized)) {
    const requestedStart = atLocal(dateKey(tomorrow), 15, 0);

    return {
      requestedDateTimeText: locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM",
      requestedStartsAt: requestedStart.toISOString(),
      requestedEndsAt: addMinutes(requestedStart, 30).toISOString(),
      needsCalendarCheck: true,
      conflictDetected: true,
      alternatives: [toSlot(tomorrow, 16, 30), toSlot(tomorrow, 17, 15)],
      scenario: "tomorrow_15",
    };
  }

  if (hasTomorrow(normalized)) {
    return {
      requestedDateTimeText: locale === "it" ? "domani" : "tomorrow",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [toSlot(tomorrow, 9, 30), toSlot(tomorrow, 11, 0)],
      scenario: "tomorrow",
    };
  }

  if (hasThursday(normalized) && hasThreePm(normalized)) {
    const requestedStart = appointmentDate({
      title: "",
      customerName: "",
      day: "thursday",
      hour: 15,
      minute: 0,
      reason: "",
      reasonEn: "",
    });

    return {
      requestedDateTimeText: locale === "it" ? "giovedì alle 15:00" : "Thursday at 3:00 PM",
      requestedStartsAt: requestedStart.toISOString(),
      requestedEndsAt: addMinutes(requestedStart, 30).toISOString(),
      needsCalendarCheck: true,
      conflictDetected: true,
      alternatives: [toSlot(friday, 9, 30), toSlot(friday, 11, 0)],
      scenario: "thursday_15",
    };
  }

  if (hasNextWeek(normalized)) {
    return {
      requestedDateTimeText: locale === "it" ? "prossima settimana" : "next week",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: [toSlot(nextTuesday, 10, 0), toSlot(nextWednesday, 15, 30)],
      scenario: "next_week",
    };
  }

  return {
    requestedDateTimeText: null,
    requestedStartsAt: null,
    requestedEndsAt: null,
    needsCalendarCheck: true,
    conflictDetected: false,
    alternatives: [toSlot(tomorrow, 16, 30), toSlot(tomorrow, 17, 15)],
    scenario: "generic_appointment",
  };
}

function buildCancellationContext(
  text: string,
  locale: SupportedLocale,
  sender: SenderIdentity,
): CancellationContext {
  const normalized = normalizeText(text);

  if (!isCancellationText(normalized)) {
    return {
      isCancellationRequest: false,
      scope: "single_or_unspecified",
      linkedAppointments: [],
      reasonText: null,
    };
  }

  return {
    isCancellationRequest: true,
    scope: detectCancellationScope(normalized),
    linkedAppointments: buildCancellationLinkedAppointments(sender, normalized, locale),
    reasonText: detectCancellationReasonText(normalized, locale),
  };
}

function isCancellationText(normalizedText: string) {
  return /(?:annullare|cancellare|disdire|eliminare appuntamento|annullare tutti gli appuntamenti|cancellare tutti gli appuntamenti|non ho piu bisogno|ho trovato un'altra soluzione|ho trovato un altra soluzione|ho risolto diversamente|\bcancel\b|cancel all appointments|cancel my appointments|no longer need|found another solution|solved it another way)/.test(normalizedText);
}

function detectCancellationScope(normalizedText: string): CancellationScope {
  return /(?:tutti gli appuntamenti|\btutti\b|all appointments|all my appointments)/.test(normalizedText)
    ? "all_future"
    : "single_or_unspecified";
}

function detectCancellationReasonText(normalizedText: string, locale: SupportedLocale) {
  if (/(ho trovato un'altra soluzione|ho trovato un altra soluzione|found another solution)/.test(normalizedText)) {
    return locale === "it" ? "hai trovato un'altra soluzione" : "you found another solution";
  }

  if (/(ho risolto diversamente|solved it another way)/.test(normalizedText)) {
    return locale === "it" ? "hai risolto diversamente" : "you solved it another way";
  }

  if (/(non ho piu bisogno|no longer need)/.test(normalizedText)) {
    return locale === "it" ? "non ne hai più bisogno" : "you no longer need it";
  }

  return null;
}

function buildCancellationLinkedAppointments(
  sender: SenderIdentity,
  normalizedText: string,
  locale: SupportedLocale,
): LinkedAppointment[] {
  const senderName = normalizeText(sender.contact?.name ?? sender.senderName ?? "");
  const isMario = senderName.includes("mario");
  const isLaura = senderName.includes("laura");
  const wantsTomorrow = hasTomorrow(normalizedText);

  if (isMario) {
    const appointments = [
      {
        title: locale === "it" ? "Consulenza Mario Rossi" : "Mario Rossi consultation",
        startsAtText: locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM",
        reason: locale === "it" ? "consulenza" : "consultation",
      },
      {
        title: locale === "it" ? "Preventivo Mario Rossi" : "Mario Rossi quote",
        startsAtText: locale === "it" ? "giovedì alle 15:00" : "Thursday at 3:00 PM",
        reason: locale === "it" ? "preventivo" : "quote",
      },
    ];

    return wantsTomorrow ? appointments.slice(0, 1) : appointments;
  }

  if (isLaura) {
    return [
      {
        title: locale === "it" ? "Consulenza Laura Bianchi" : "Laura Bianchi consultation",
        startsAtText: locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM",
        reason: locale === "it" ? "consulenza" : "consultation",
      },
    ];
  }

  return [
    {
      title: locale === "it" ? "Prossimo appuntamento demo" : "Next demo appointment",
      startsAtText: locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM",
      reason: locale === "it" ? "appuntamento dimostrativo" : "demo appointment",
    },
  ];
}

function calendarFromCancellation(
  cancellation: CancellationContext,
  locale: SupportedLocale,
): DemoCalendarResult {
  return {
    requestedDateTimeText: cancellation.scope === "all_future"
      ? locale === "it" ? "tutti gli appuntamenti futuri" : "all future appointments"
      : cancellation.linkedAppointments[0]?.startsAtText ?? (locale === "it" ? "appuntamento da annullare" : "appointment to cancel"),
    requestedStartsAt: null,
    requestedEndsAt: null,
    needsCalendarCheck: true,
    conflictDetected: false,
    alternatives: [],
    scenario: "none",
  };
}

function buildCancellationSummary(
  cancellation: CancellationContext,
  sender: SenderIdentity,
  locale: SupportedLocale,
) {
  const customerName = senderDisplayName(sender);
  const customer = firstName(customerName) ?? (locale === "it" ? "Il cliente" : "The customer");

  if (locale === "en") {
    return cancellation.scope === "all_future"
      ? `${customer} is asking to cancel all their future appointments.`
      : `${customer} is asking to cancel the linked appointment.`;
  }

  return cancellation.scope === "all_future"
    ? `${customer} chiede di annullare tutti i suoi appuntamenti futuri.`
    : `${customer} chiede di annullare l'appuntamento collegato.`;
}

function buildCancellationSuggestedReply(
  cancellation: CancellationContext,
  sender: SenderIdentity,
  locale: SupportedLocale,
) {
  const customer = firstName(senderDisplayName(sender));
  const greeting = customer
    ? locale === "it" ? `Certo ${customer}` : `Of course ${customer}`
    : locale === "it" ? "Certo" : "Of course";

  if (locale === "en") {
    const reason = cancellation.reasonText ? ` because ${cancellation.reasonText}` : "";
    const object = cancellation.scope === "all_future" ? "the scheduled appointments" : "the scheduled appointment";
    return `${greeting}, no problem. I understand you’d like to cancel ${object}${reason}. I’ll prepare the cancellation, but nothing will be changed without confirmation.`;
  }

  const reason = cancellation.reasonText ? ` perché ${cancellation.reasonText}` : "";
  const object = cancellation.scope === "all_future" ? "gli appuntamenti previsti" : "l'appuntamento previsto";
  return `${greeting}, nessun problema. Ho capito che vuoi annullare ${object}${reason}. Preparo la cancellazione, ma nessuna modifica viene fatta senza conferma.`;
}

function buildThirdPartyRequestContext(
  text: string,
  locale: SupportedLocale,
  sender: SenderIdentity,
): ThirdPartyRequestContext {
  const normalized = normalizeText(text);

  if (!isThirdPartyAppointmentRequest(normalized)) {
    return emptyThirdPartyRequestContext();
  }

  const referredPersonName = extractReferredPersonName(text, locale);
  const referredPersonPhone = extractDisplayPhoneFromText(text);
  const urgency: Urgency = /\b(urgente|urgent|urgently)\b/.test(normalized) ? "urgent" : "normal";
  const reason = detectAppointmentReason(text, locale);
  const referredByName = sender.customerIdentified
    ? sender.contact?.name ?? sender.senderName
    : null;
  const referredByContact = sender.customerIdentified ? sender.senderContact : null;
  const missingFields = buildThirdPartyMissingFields({
    locale,
    referredPersonName,
    referredPersonPhone,
    reason,
  });
  const clarificationQuestion = buildThirdPartyClarificationQuestion({
    locale,
    referredPersonName,
    missingFields,
  });

  return {
    isThirdPartyRequest: true,
    referredPersonName,
    referredPersonPhone,
    referredByName,
    referredByContact,
    urgency,
    reason,
    missingFields,
    clarificationQuestion,
    contactActionType: referredPersonName && referredPersonPhone
      ? "prepare_message_to_referred_person"
      : "ask_sender_clarification",
  };
}

function emptyThirdPartyRequestContext(): ThirdPartyRequestContext {
  return {
    isThirdPartyRequest: false,
    referredPersonName: null,
    referredPersonPhone: null,
    referredByName: null,
    referredByContact: null,
    urgency: "normal",
    reason: null,
    missingFields: [],
    clarificationQuestion: null,
    contactActionType: null,
  };
}

function isThirdPartyAppointmentRequest(normalizedText: string) {
  const referralSignal = /(?:\bun mio amico\b|\buna mia amica\b|\bmio cliente\b|\bmia cliente\b|\bil mio amico\b|\bla mia amica\b|\bmy friend\b|\bmy client\b|\bfriend of mine\b|\bclient\b)/.test(normalizedText);
  const contactSignal = /(?:puoi contattare|puoi chiamare|contattare|chiamare|al numero|can you contact|please call|contact my|call my|at \d)/.test(normalizedText);
  const appointmentSignal = /(?:appuntamento|appointment|preventivo|quote|consulenza|consultation)/.test(normalizedText);

  return appointmentSignal && (referralSignal || contactSignal) && !/\b(call me back|mi richiami|chiamami)\b/.test(normalizedText);
}

function extractReferredPersonName(text: string, locale: SupportedLocale) {
  const patterns = locale === "it"
    ? [
        /\b(?:un mio amico|una mia amica|il mio amico|la mia amica|mio cliente|mia cliente|il mio cliente|la mia cliente)\s+([A-Za-zÀ-ÖØ-öø-ÿ']+)/i,
        /\b(?:contattare|chiamare)\s+(?:il\s+|la\s+)?(?:mio\s+|mia\s+)?(?:amico|amica|cliente)\s+([A-Za-zÀ-ÖØ-öø-ÿ']+)/i,
      ]
    : [
        /\bmy\s+(?:friend|client)\s+([A-Za-zÀ-ÖØ-öø-ÿ']+)/i,
        /\b(?:contact|call)\s+my\s+(?:friend|client)\s+([A-Za-zÀ-ÖØ-öø-ÿ']+)/i,
      ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return toDisplayName(match[1]);
    }
  }

  return null;
}

function extractDisplayPhoneFromText(text: string) {
  const phone = text.match(/\+?\d[\d\s().-]{5,}\d/)?.[0] ?? null;

  if (!phone) {
    return null;
  }

  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/^\+39/, "");

  if (/^3\d{9}$/.test(digits)) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }

  return normalized;
}

function buildThirdPartyMissingFields(input: {
  locale: SupportedLocale;
  referredPersonName: string | null;
  referredPersonPhone: string | null;
  reason: string | null;
}) {
  const fields: string[] = [];

  if (!input.referredPersonName) {
    fields.push(input.locale === "it" ? "nome persona da contattare" : "person to contact");
  }

  if (!input.referredPersonPhone) {
    fields.push(input.locale === "it" ? "numero di telefono" : "phone number");
  }

  if (!input.reason) {
    fields.push(input.locale === "it" ? "motivo appuntamento" : "appointment reason");
  }

  return fields;
}

function buildThirdPartyClarificationQuestion(input: {
  locale: SupportedLocale;
  referredPersonName: string | null;
  missingFields: string[];
}) {
  if (input.missingFields.length === 0) {
    return null;
  }

  if (input.locale === "en") {
    if (input.missingFields.includes("person to contact")) {
      return "Could you confirm the name of the person to contact?";
    }

    if (input.missingFields.includes("phone number")) {
      return "Could you share the phone number where I should contact them?";
    }

    return input.referredPersonName
      ? `What would the appointment be for, ${input.referredPersonName}?`
      : "What would the appointment be for?";
  }

  if (input.missingFields.includes("nome persona da contattare")) {
    return "Mi confermi il nome della persona da contattare?";
  }

  if (input.missingFields.includes("numero di telefono")) {
    return "Mi indichi il numero a cui contattarlo?";
  }

  return input.referredPersonName
    ? `Mi puoi indicare per quale motivo ti serve l'appuntamento, ${input.referredPersonName}?`
    : "Mi indichi per quale motivo ha bisogno dell'appuntamento?";
}

function calendarFromThirdPartyRequest(
  thirdParty: ThirdPartyRequestContext,
  locale: SupportedLocale,
): DemoCalendarResult {
  if (thirdParty.missingFields.length > 0) {
    return emptyCalendar(thirdParty.urgency === "urgent" ? locale === "it" ? "appuntamento urgente" : "urgent appointment" : null);
  }

  const tomorrow = addDays(new Date(), 1);

  return {
    requestedDateTimeText: thirdParty.urgency === "urgent"
      ? locale === "it" ? "appuntamento urgente" : "urgent appointment"
      : locale === "it" ? "appuntamento" : "appointment",
    requestedStartsAt: null,
    requestedEndsAt: null,
    needsCalendarCheck: true,
    conflictDetected: false,
    alternatives: [toSlot(tomorrow, 9, 30), toSlot(tomorrow, 11, 0)],
    scenario: "generic_appointment",
  };
}

function buildThirdPartySummary(
  thirdParty: ThirdPartyRequestContext,
  locale: SupportedLocale,
) {
  const referrer = formatNullableContactName(thirdParty.referredByName, locale);
  const referred = formatNullableContactName(thirdParty.referredPersonName, locale);
  const phone = thirdParty.referredPersonPhone
    ? ` ${locale === "it" ? "al" : "at"} ${thirdParty.referredPersonPhone}`
    : "";
  const urgency = thirdParty.urgency === "urgent"
    ? locale === "it" ? " urgente" : " urgent"
    : "";

  if (locale === "en") {
    const missing = thirdParty.missingFields.length > 0
      ? ` Missing: ${thirdParty.missingFields.join(", ")}.`
      : "";
    const reason = thirdParty.reason ? ` for ${formatThirdPartyReason(thirdParty.reason, locale)}` : "";

    return `${referrer} asks to contact ${referred}${phone} for an${urgency} appointment${reason}.${missing}`;
  }

  const missing = thirdParty.missingFields.length > 0
    ? ` Mancante: ${thirdParty.missingFields.join(", ")}.`
    : "";
  const reason = thirdParty.reason ? ` per ${formatThirdPartyReason(thirdParty.reason, locale)}` : "";

  return `${referrer} chiede di contattare ${referred}${phone} per un appuntamento${urgency}${reason}.${missing}`;
}

function buildThirdPartySuggestedReply(
  thirdParty: ThirdPartyRequestContext,
  locale: SupportedLocale,
) {
  if (thirdParty.missingFields.length > 0) {
    return buildThirdPartyClarificationReply(thirdParty, locale);
  }

  const name = thirdParty.referredPersonName ?? (locale === "it" ? "Gianni" : "John");
  const reason = thirdParty.reason
    ? formatThirdPartyReason(thirdParty.reason, locale)
    : locale === "it" ? "l'appuntamento" : "the appointment";

  if (locale === "en") {
    const referrer = firstName(thirdParty.referredByName) ?? "someone";
    const urgency = thirdParty.urgency === "urgent" ? "urgent " : "";

    return `Hi ${name}, I’m contacting you because ${referrer} mentioned that you may need an ${urgency}appointment for ${reason}. I have availability tomorrow at 9:30 AM or 11:00 AM. Which time works best for you?`;
  }

  const referrer = firstName(thirdParty.referredByName) ?? "qualcuno";
  const urgency = thirdParty.urgency === "urgent" ? " urgente" : "";

  return `Ciao ${name}, ti contatto perché ${referrer} mi ha segnalato che avresti bisogno di un appuntamento${urgency} per ${reason}. Ho disponibilità domani alle 9:30 oppure alle 11:00. Quale orario preferisci?`;
}

function buildThirdPartyClarificationReply(
  thirdParty: ThirdPartyRequestContext,
  locale: SupportedLocale,
) {
  const referrerFirstName = firstName(thirdParty.referredByName);
  const referred = thirdParty.referredPersonName ?? (locale === "it" ? "la persona indicata" : "the person you mentioned");

  if (locale === "en") {
    if (thirdParty.missingFields.includes("phone number")) {
      const greeting = referrerFirstName ? `Of course ${referrerFirstName}` : "Of course";
      return `${greeting}, I can prepare a message for ${referred}. Could you share the phone number where I should contact them?`;
    }

    if (thirdParty.missingFields.includes("person to contact")) {
      const greeting = referrerFirstName ? `Of course ${referrerFirstName}` : "Of course";
      return `${greeting}, I can prepare a message for them. Could you confirm the name of the person to contact?`;
    }

    const urgency = thirdParty.urgency === "urgent" ? " urgent" : "";
    const referrer = referrerFirstName ?? "someone";

    return `Hi ${referred}, I’m contacting you because ${referrer} mentioned that you may need an${urgency} appointment. What would the appointment be for, so I can check the most suitable availability?`;
  }

  if (thirdParty.missingFields.includes("numero di telefono")) {
    const greeting = referrerFirstName ? `Certo ${referrerFirstName}` : "Certo";
    return `${greeting}, posso preparare un messaggio per ${referred}. Mi indichi il numero a cui contattarlo?`;
  }

  if (thirdParty.missingFields.includes("nome persona da contattare")) {
    const greeting = referrerFirstName ? `Certo ${referrerFirstName}` : "Certo";
    return `${greeting}, posso preparare un messaggio. Mi confermi il nome della persona da contattare?`;
  }

  const urgency = thirdParty.urgency === "urgent" ? " urgente" : "";
  const referrer = referrerFirstName ?? "qualcuno";

  return `Ciao ${referred}, ti contatto perché ${referrer} mi ha segnalato che avresti bisogno di un appuntamento${urgency}. Mi puoi indicare per quale motivo ti serve, così verifico la disponibilità più adatta?`;
}

function formatThirdPartyReason(reason: string, locale: SupportedLocale) {
  if (locale === "en") {
    const articleByReason: Record<string, string> = {
      quote: "a quote",
      consultation: "a consultation",
      check: "a check",
      "check-up": "a check-up",
      visit: "a visit",
      "urgent appointment": "an urgent appointment",
      "urgent cavity-related appointment": "an urgent cavity-related appointment",
      "urgent tooth pain appointment": "an urgent tooth pain appointment",
      "first available slot": "the first available slot",
    };

    return articleByReason[reason] ?? reason;
  }

  const articleByReason: Record<string, string> = {
    preventivo: "un preventivo",
    "igiene dentale": "un'igiene dentale",
    consulenza: "una consulenza",
    controllo: "un controllo",
    visita: "una visita",
    sopralluogo: "un sopralluogo",
    "appuntamento urgente": "un appuntamento urgente",
    "urgenza per carie": "un’urgenza legata a una carie",
    "urgenza per dolore ai denti": "un’urgenza per dolore ai denti",
    "prima disponibilità utile": "la prima disponibilità utile",
  };

  return articleByReason[reason] ?? reason;
}

function formatReasonForReply(reason: string, locale: SupportedLocale) {
  return formatThirdPartyReason(reason, locale);
}

function formatNullableContactName(value: string | null, locale: SupportedLocale) {
  return value ?? (locale === "it" ? "Il mittente" : "The sender");
}

function firstName(value: string | null) {
  return value?.trim().split(/\s+/)[0] ?? null;
}

function senderDisplayName(sender: SenderIdentity) {
  return sender.customerIdentified ? sender.contact?.name ?? sender.senderName : null;
}

function toDisplayName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function buildMultipleAppointmentRequests(
  text: string,
  locale: SupportedLocale,
): DemoAppointmentRequestDraft[] {
  const normalized = normalizeText(text);

  if (!hasMultipleAppointmentSignal(normalized)) {
    return [];
  }

  const now = new Date();
  const requests: DemoAppointmentRequestDraft[] = [];
  const appliesMorningToBoth = hasMorning(normalized);
  const hasTomorrowRequest = hasTomorrow(normalized);
  const hasNextWeekRequest = hasNextWeek(normalized);

  if (hasTomorrowRequest) {
    requests.push(buildMultipleAppointmentRequest({
      id: "appointment-1",
      kind: appliesMorningToBoth ? "tomorrow_morning" : hasAfternoon(normalized) ? "tomorrow_afternoon" : "tomorrow_morning",
      locale,
      now,
      reason: inferFirstMultipleAppointmentReason(normalized, locale),
    }));
  }

  if (hasNextWeekRequest) {
    requests.push(buildMultipleAppointmentRequest({
      id: `appointment-${requests.length + 1}`,
      kind: appliesMorningToBoth ? "next_week_morning" : "next_week_generic",
      locale,
      now,
      reason: inferSecondMultipleAppointmentReason(normalized, locale),
    }));
  }

  return requests.length > 1 ? requests : [];
}

function hasMultipleAppointmentSignal(normalizedText: string) {
  return /(?:\b(?:due|2)\s+appuntamenti\b|\btwo appointments\b|\buno\s+(?:per\s+)?domani\b.*\b(?:un[' ]?altro|uno)\b|\bone\s+tomorrow\b.*\b(?:another|one)\b|\bsia\b.*\bche\b|\bper entrambi\b|\bil primo\b|\bil secondo\b|\bfirst one\b|\bsecond one\b|\bquello di\b.*\bquello\b)/.test(normalizedText);
}

type MultipleAppointmentKind =
  | "tomorrow_morning"
  | "tomorrow_afternoon"
  | "next_week_morning"
  | "next_week_generic";

function buildMultipleAppointmentRequest(input: {
  id: string;
  kind: MultipleAppointmentKind;
  locale: SupportedLocale;
  now: Date;
  reason: string;
}): DemoAppointmentRequestDraft {
  const alternativeSlots = getMultipleAppointmentAlternativeSlots(input.kind, input.now);
  const requestedDateTimeText = labelMultipleAppointmentDate(input.kind, input.locale);

  return {
    id: input.id,
    type: "new_appointment",
    summary: input.locale === "it"
      ? `Appuntamento ${requestedDateTimeText} per ${input.reason}.`
      : `Appointment ${requestedDateTimeText} to ${input.reason}.`,
    requestedDateTimeText,
    reason: input.reason,
    needsClarification: false,
    clarificationQuestion: null,
    alternatives: alternativeSlots.map((slot) => formatMultipleAppointmentAlternative(slot.startsAt, input.kind, input.locale)),
    alternativeSlots,
  };
}

function getMultipleAppointmentAlternativeSlots(kind: MultipleAppointmentKind, now: Date) {
  const tomorrow = addDays(now, 1);
  const nextMonday = nextWeekStart(now);
  const nextTuesday = addDays(nextMonday, 1);
  const nextWednesday = addDays(nextMonday, 2);

  if (kind === "tomorrow_morning") {
    return [toSlot(tomorrow, 9, 30), toSlot(tomorrow, 11, 0)];
  }

  if (kind === "tomorrow_afternoon") {
    return [toSlot(tomorrow, 16, 30), toSlot(tomorrow, 17, 15)];
  }

  if (kind === "next_week_morning") {
    return [toSlot(nextTuesday, 10, 0), toSlot(nextWednesday, 9, 30)];
  }

  return [toSlot(nextTuesday, 10, 0), toSlot(nextWednesday, 15, 30)];
}

function labelMultipleAppointmentDate(kind: MultipleAppointmentKind, locale: SupportedLocale) {
  const labels: Record<MultipleAppointmentKind, { it: string; en: string }> = {
    tomorrow_morning: { it: "domani mattina", en: "tomorrow morning" },
    tomorrow_afternoon: { it: "domani pomeriggio", en: "tomorrow afternoon" },
    next_week_morning: { it: "prossima settimana al mattino", en: "next week in the morning" },
    next_week_generic: { it: "prossima settimana", en: "next week" },
  };

  return labels[kind][locale];
}

function inferFirstMultipleAppointmentReason(normalizedText: string, locale: SupportedLocale) {
  if (locale === "en") {
    if (/\bquote\b|\bestimate\b/.test(normalizedText)) {
      return "discuss the quote";
    }

    return "discuss the appointment details";
  }

  if (/\bpreventivo\b/.test(normalizedText)) {
    return "discutere il preventivo";
  }

  return "discutere i dettagli";
}

function inferSecondMultipleAppointmentReason(normalizedText: string, locale: SupportedLocale) {
  if (locale === "en") {
    if (/\bfinali[sz]e\b.*\bprice\b|\bprice\b/.test(normalizedText)) {
      return "finalize the price";
    }

    return "finalize the details";
  }

  if (/\bprezzo finale\b|\bdefinire\b.*\bprezzo\b/.test(normalizedText)) {
    return "definire il prezzo finale";
  }

  if (/\bchiudere\b.*\bprezzo\b/.test(normalizedText)) {
    return "chiudere il prezzo";
  }

  return "definire i dettagli finali";
}

function calendarFromMultipleAppointmentRequests(requests: DemoAppointmentRequestDraft[]): DemoCalendarResult {
  return {
    requestedDateTimeText: requests.map((request) => request.requestedDateTimeText).join("; ") || null,
    requestedStartsAt: null,
    requestedEndsAt: null,
    needsCalendarCheck: true,
    conflictDetected: false,
    alternatives: requests.flatMap((request) => request.alternativeSlots),
    scenario: "generic_appointment",
  };
}

function toDemoAppointmentRequest(request: DemoAppointmentRequestDraft): DemoAppointmentRequest {
  return {
    id: request.id,
    type: request.type,
    summary: request.summary,
    requestedDateTimeText: request.requestedDateTimeText,
    reason: request.reason,
    needsClarification: request.needsClarification,
    clarificationQuestion: request.clarificationQuestion,
    alternatives: request.alternatives,
  };
}

function buildMultipleAppointmentPrimarySummary(
  requests: DemoAppointmentRequestDraft[],
  locale: SupportedLocale,
) {
  const joined = requests
    .map((request) => `${request.requestedDateTimeText} (${request.reason})`)
    .join(locale === "it" ? "; " : "; ");

  return locale === "it"
    ? `${requests.length} appuntamenti: ${joined}.`
    : `${requests.length} appointments: ${joined}.`;
}

function buildMultipleAppointmentSummary(
  requests: DemoAppointmentRequestDraft[],
  locale: SupportedLocale,
) {
  return locale === "it"
    ? `Rilevate ${requests.length} richieste di appuntamento distinte: ${requests.map((request) => `${request.requestedDateTimeText} per ${request.reason}`).join("; ")}.`
    : `Detected ${requests.length} separate appointment requests: ${requests.map((request) => `${request.requestedDateTimeText} to ${request.reason}`).join("; ")}.`;
}

function buildMultipleAppointmentSuggestedReply(
  requests: DemoAppointmentRequestDraft[],
  locale: SupportedLocale,
  sender: SenderIdentity,
) {
  const first = requests[0];
  const second = requests[1];

  if (!first || !second) {
    return locale === "it"
      ? "Certo, posso preparare due appuntamenti separati. Mi confermi i dettagli di entrambi?"
      : "I can schedule two separate appointments. Could you confirm the details for both?";
  }

  if (locale === "en") {
    return [
      "I can schedule two separate appointments.",
      `For ${first.requestedDateTimeText}, I have availability at ${formatMultipleAppointmentReplyAlternatives(first, locale)} to ${first.reason}.`,
      `For ${second.requestedDateTimeText}, I can offer ${formatMultipleAppointmentReplyAlternatives(second, locale)} to ${second.reason}.`,
      "Which times work best for you?",
    ].join(" ");
  }

  const firstName = getReplyFirstName(sender);
  const opening = firstName
    ? `Certo ${firstName}, possiamo fissare due appuntamenti separati.`
    : "Certo, possiamo fissare due appuntamenti separati.";

  return [
    opening,
    `Per ${formatMultipleAppointmentReplyDate(first, locale)} ho disponibilità ${formatMultipleAppointmentReplyAlternatives(first, locale)} per ${first.reason}.`,
    `Per ${formatMultipleAppointmentReplyDate(second, locale)} posso proporti ${formatMultipleAppointmentReplyAlternatives(second, locale)} per ${second.reason}.`,
    "Quali orari preferisci?",
  ].join(" ");
}

function formatMultipleAppointmentReplyDate(
  request: DemoAppointmentRequestDraft,
  locale: SupportedLocale,
) {
  if (locale === "it" && request.requestedDateTimeText.startsWith("prossima settimana")) {
    return `la ${request.requestedDateTimeText}`;
  }

  return request.requestedDateTimeText;
}

function formatMultipleAppointmentAlternative(
  startsAt: string,
  kind: MultipleAppointmentKind,
  locale: SupportedLocale,
) {
  const time = formatSlotTime(startsAt, locale);

  if (kind === "tomorrow_morning" || kind === "tomorrow_afternoon") {
    return locale === "it" ? `domani alle ${time}` : `tomorrow at ${time}`;
  }

  return formatSlotDayTime(startsAt, locale);
}

function formatMultipleAppointmentReplyAlternatives(
  request: DemoAppointmentRequestDraft,
  locale: SupportedLocale,
) {
  const isTomorrowRequest = request.requestedDateTimeText.includes(locale === "it" ? "domani" : "tomorrow");

  return request.alternativeSlots
    .map((slot) => {
      const time = formatSlotTime(slot.startsAt, locale);

      if (isTomorrowRequest) {
        return locale === "it" ? `alle ${time}` : time;
      }

      return formatSlotDayTime(slot.startsAt, locale);
    })
    .join(locale === "it" ? " oppure " : " or ");
}

function resolveDemoRescheduleCalendar(
  normalizedText: string,
  locale: SupportedLocale,
  now: Date,
  tomorrow: Date,
  dayAfterTomorrow: Date,
  friday: Date,
): DemoCalendarResult {
  if (hasDayAfterTomorrow(normalizedText)) {
    return {
      requestedDateTimeText: locale === "it" ? "dopodomani" : "day after tomorrow",
      requestedStartsAt: null,
      requestedEndsAt: null,
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: getDemoRescheduleAlternativesForRequestedDate("day_after_tomorrow", {
        dayAfterTomorrow,
        friday,
        tomorrow,
      }),
      scenario: "reschedule_day_after_tomorrow",
    };
  }

  if (hasThursday(normalizedText) && hasThreePm(normalizedText)) {
    const requestedStart = appointmentDate({
      title: "",
      customerName: "",
      day: "thursday",
      hour: 15,
      minute: 0,
      reason: "",
      reasonEn: "",
    });

    return {
      requestedDateTimeText: locale === "it" ? "giovedì alle 15:00" : "Thursday at 3:00 PM",
      requestedStartsAt: requestedStart.toISOString(),
      requestedEndsAt: addMinutes(requestedStart, 30).toISOString(),
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: getDemoRescheduleAlternativesForRequestedDate("thursday", {
        dayAfterTomorrow,
        friday,
        tomorrow,
      }),
      scenario: "thursday_15",
    };
  }

  if (hasTomorrow(normalizedText)) {
    const requestedStart = atLocal(dateKey(tomorrow), 15, 0);

    return {
      requestedDateTimeText: locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM",
      requestedStartsAt: requestedStart.toISOString(),
      requestedEndsAt: addMinutes(requestedStart, 30).toISOString(),
      needsCalendarCheck: true,
      conflictDetected: false,
      alternatives: getDemoRescheduleAlternativesForRequestedDate("tomorrow", {
        dayAfterTomorrow,
        friday,
        tomorrow,
      }),
      scenario: "reschedule_tomorrow",
    };
  }

  const requestedStart = atLocal(dateKey(now), 15, 0);

  return {
    requestedDateTimeText: locale === "it" ? "oggi alle 15:00" : "today at 3:00 PM",
    requestedStartsAt: requestedStart.toISOString(),
    requestedEndsAt: addMinutes(requestedStart, 30).toISOString(),
    needsCalendarCheck: true,
    conflictDetected: false,
    alternatives: getDemoRescheduleAlternativesForRequestedDate("unknown", {
      dayAfterTomorrow,
      friday,
      tomorrow,
    }),
    scenario: "reschedule_generic",
  };
}

function getDemoRescheduleAlternativesForRequestedDate(
  dateKind: DemoRequestedDateKind,
  dates: {
    tomorrow: Date;
    dayAfterTomorrow: Date;
    friday: Date;
  },
) {
  if (dateKind === "day_after_tomorrow") {
    return [toSlot(dates.dayAfterTomorrow, 9, 30), toSlot(dates.dayAfterTomorrow, 11, 0)];
  }

  if (dateKind === "tomorrow") {
    return [toSlot(dates.tomorrow, 16, 30), toSlot(dates.dayAfterTomorrow, 9, 30)];
  }

  if (dateKind === "thursday") {
    return [toSlot(dates.friday, 9, 30), toSlot(dates.friday, 11, 0)];
  }

  return [toSlot(dates.tomorrow, 16, 30), toSlot(dates.friday, 11, 0)];
}

function emptyCalendar(requestedDateTimeText: string | null): DemoCalendarResult {
  return {
    requestedDateTimeText,
    requestedStartsAt: null,
    requestedEndsAt: null,
    needsCalendarCheck: false,
    conflictDetected: false,
    alternatives: [],
    scenario: "none",
  };
}

function resolveRequestedNewDateText(
  text: string,
  intent: DemoDetectedIntent,
  calendar: DemoCalendarResult,
  locale: SupportedLocale,
) {
  if (intent !== "reschedule_appointment") {
    return null;
  }

  const requestedDate = extractDemoRequestedDateText(text, locale);

  if (calendar.scenario === "reschedule_day_after_tomorrow") {
    return requestedDate.text ?? (locale === "it" ? "dopodomani" : "day after tomorrow");
  }

  if (requestedDate.text && isExplicitRescheduleTargetDate(text, requestedDate.kind)) {
    return requestedDate.text;
  }

  return null;
}

function extractDemoRequestedDateText(
  customerText: string,
  locale: SupportedLocale,
): { kind: DemoRequestedDateKind; text: string | null } {
  const normalized = normalizeText(customerText);

  if (hasDayAfterTomorrow(normalized)) {
    return {
      kind: "day_after_tomorrow",
      text: locale === "it" ? "dopodomani" : "day after tomorrow",
    };
  }

  if (hasTomorrow(normalized)) {
    return {
      kind: "tomorrow",
      text: locale === "it" ? "domani" : "tomorrow",
    };
  }

  if (hasToday(normalized)) {
    return {
      kind: "today",
      text: locale === "it" ? "oggi" : "today",
    };
  }

  if (hasFriday(normalized)) {
    return {
      kind: "friday",
      text: locale === "it" ? "venerdì" : "Friday",
    };
  }

  if (hasThursday(normalized)) {
    return {
      kind: "thursday",
      text: locale === "it" ? "giovedì" : "Thursday",
    };
  }

  if (hasNextWeek(normalized)) {
    return {
      kind: "next_week",
      text: locale === "it" ? "prossima settimana" : "next week",
    };
  }

  return {
    kind: "unknown",
    text: null,
  };
}

function isExplicitRescheduleTargetDate(text: string, kind: DemoRequestedDateKind) {
  if (kind === "unknown") {
    return false;
  }

  const normalized = normalizeText(text);

  if (kind === "day_after_tomorrow") {
    return true;
  }

  const phraseByKind: Record<Exclude<DemoRequestedDateKind, "unknown">, string> = {
    day_after_tomorrow: "(?:dopo\\s+domani|dopodomani|day\\s+after\\s+tomorrow)",
    tomorrow: "(?:domani|tomorrow)",
    today: "(?:oggi|today)",
    friday: "(?:venerdi|friday)",
    thursday: "(?:giovedi|thursday)",
    next_week: "(?:prossima\\s+settimana|next\\s+week)",
  };
  const phrase = phraseByKind[kind];

  return new RegExp(`\\b(?:a|al|alla|per|verso|to|for|on)\\s+(?:il\\s+|la\\s+|the\\s+)?${phrase}\\b`).test(normalized);
}

function matchAppointment(
  sender: SenderIdentity,
  text: string,
  intent: DemoDetectedIntent,
  locale: SupportedLocale,
): MatchedAppointment {
  if (intent === "reschedule_appointment") {
    return buildDemoRescheduleAppointment(sender, text, locale);
  }

  if (intent === "appointment_lookup") {
    return buildDemoLookupAppointment(sender, locale);
  }

  if (!sender.contact || intent !== "delay_notice") {
    return emptyMatchedAppointment();
  }

  const appointments = demoAppointments.filter((appointment) => appointment.customerName === sender.contact?.name);

  if (intent === "delay_notice" && appointments.length > 0) {
    return toMatchedAppointment(appointments[0], locale, 0.82);
  }

  const normalized = normalizeText(text);
  const appointment = appointments.find((candidate) => appointmentReferenceMatches(candidate, normalized));

  return appointment
    ? toMatchedAppointment(appointment, locale, 0.96)
    : emptyMatchedAppointment();
}

function buildDemoLookupAppointment(
  sender: SenderIdentity,
  locale: SupportedLocale,
): MatchedAppointment {
  const senderText = normalizeText([
    sender.senderText,
    sender.senderName,
    sender.contact?.name,
  ].filter(Boolean).join(" "));
  const localized = lookupAppointmentCopy(locale);

  if (senderText.includes("luca")) {
    return {
      found: true,
      title: locale === "it" ? "Consulenza Luca" : "Luca consultation",
      customerName: "Luca",
      startsAtText: localized.tomorrowAtThree,
      reason: localized.consultation,
      confidence: 0.96,
    };
  }

  if (senderText.includes("mario")) {
    return {
      found: true,
      title: locale === "it" ? "Preventivo Mario Rossi" : "Mario Rossi quote",
      customerName: "Mario Rossi",
      startsAtText: localized.thursdayAtThree,
      reason: localized.quote,
      confidence: 0.96,
    };
  }

  if (senderText.includes("laura")) {
    return {
      found: true,
      title: locale === "it" ? "Consulenza Laura Bianchi" : "Laura Bianchi consultation",
      customerName: "Laura Bianchi",
      startsAtText: localized.tomorrowAtThree,
      reason: localized.consultation,
      confidence: 0.96,
    };
  }

  const customerName = sender.customerIdentified && sender.senderName
    ? sender.senderName
    : defaultSender(sender.senderSource, locale);

  return {
    found: true,
    title: locale === "it" ? "Appuntamento demo" : "Demo appointment",
    customerName,
    startsAtText: localized.tomorrowAtThree,
    reason: localized.demoAppointment,
    confidence: 0.88,
  };
}

function lookupAppointmentCopy(locale: SupportedLocale) {
  return locale === "it"
    ? {
        tomorrowAtThree: "domani alle 15:00",
        thursdayAtThree: "giovedì alle 15:00",
        consultation: "consulenza",
        quote: "preventivo",
        demoAppointment: "appuntamento dimostrativo",
      }
    : {
        tomorrowAtThree: "tomorrow at 3:00 PM",
        thursdayAtThree: "Thursday at 3:00 PM",
        consultation: "consultation",
        quote: "quote",
        demoAppointment: "demo appointment",
      };
}

function buildDemoRescheduleAppointment(
  sender: SenderIdentity,
  text: string,
  locale: SupportedLocale,
): MatchedAppointment {
  const normalized = normalizeText(text);
  const customerName = senderDisplayName(sender);
  const displayName = customerName ?? (locale === "it" ? "cliente" : "customer");
  const startsAtText = resolveDemoRescheduleStartsAtText(normalized, locale);

  return {
    found: true,
    title: locale === "it" ? `Appuntamento demo ${displayName}` : `Demo appointment ${displayName}`,
    customerName,
    startsAtText,
    reason: locale === "it" ? "appuntamento dimostrativo" : "demo appointment",
    confidence: hasDayAfterTomorrow(normalized) || hasThursday(normalized) || hasTomorrow(normalized) ? 0.96 : 0.88,
  };
}

function resolveDemoRescheduleStartsAtText(normalizedText: string, locale: SupportedLocale) {
  if (hasThursday(normalizedText) && hasThreePm(normalizedText)) {
    return locale === "it" ? "giovedì alle 15:00" : "Thursday at 3:00 PM";
  }

  if (hasDayAfterTomorrow(normalizedText)) {
    return locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM";
  }

  if (hasTomorrow(normalizedText)) {
    return locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM";
  }

  return locale === "it" ? "oggi alle 15:00" : "today at 3:00 PM";
}

function appointmentReferenceMatches(appointment: DemoAppointment, normalizedText: string) {
  if (appointment.day === "thursday" && hasThursday(normalizedText) && hasThreePm(normalizedText)) {
    return true;
  }

  if (appointment.day === "tomorrow" && hasTomorrow(normalizedText) && hasThreePm(normalizedText)) {
    return true;
  }

  if (appointment.day === "next_tuesday" && /\b(martedi|tuesday)\b/.test(normalizedText)) {
    return true;
  }

  return false;
}

function emptyMatchedAppointment(): MatchedAppointment {
  return {
    found: false,
    title: null,
    customerName: null,
    startsAtText: null,
    reason: null,
    confidence: 0,
  };
}

function toMatchedAppointment(
  appointment: DemoAppointment,
  locale: SupportedLocale,
  confidence: number,
): MatchedAppointment {
  return {
    found: true,
    title: appointment.title,
    customerName: appointment.customerName,
    startsAtText: formatAppointmentStartsAt(appointment, locale),
    reason: locale === "it" ? appointment.reason : appointment.reasonEn,
    confidence,
  };
}

function resolveAppointmentContextType(intent: DemoDetectedIntent): AppointmentContextType {
  if (intent === "new_appointment") {
    return "new_appointment";
  }

  if (intent === "cancel_appointment") {
    return "cancel_existing";
  }

  if (intent === "appointment_lookup") {
    return "lookup_existing";
  }

  if (intent === "reschedule_appointment") {
    return "reschedule_existing";
  }

  if (intent === "delay_notice") {
    return "delay_existing";
  }

  if (intent === "callback_request") {
    return "callback_request";
  }

  if (intent === "manual_review") {
    return "unknown";
  }

  return "generic_request";
}

function resolveClarification(input: {
  locale: SupportedLocale;
  intent: DemoDetectedIntent;
  reason: string | null;
  sender: SenderIdentity;
  matchedAppointment: MatchedAppointment;
  calendar: DemoCalendarResult;
  customerText: string;
}) {
  if (input.intent === "new_appointment" && !input.reason) {
    return {
      key: "appointmentReasonMissing",
      question: input.locale === "it"
        ? "Certamente. Per cosa ti servirebbe l'appuntamento? Così verifico la disponibilità più adatta."
        : "Of course. What would the appointment be for? That way I can check the most suitable availability.",
    };
  }

  if (input.intent === "new_appointment" && !input.calendar.requestedDateTimeText) {
    return {
      key: "appointmentTimeMissing",
      question: input.locale === "it"
        ? "Mi indichi quale giorno o fascia oraria preferisci?"
        : "Could you tell me which day or time window you prefer?",
    };
  }

  if (input.intent === "manual_review") {
    return {
      key: "manualReview",
      question: input.locale === "it"
        ? "Mi dai qualche dettaglio in più sulla richiesta?"
        : "Could you share a few more details about the request?",
    };
  }

  return {
    key: null,
    question: null,
  };
}

function resolveRecommendedNextStep(input: {
  intent: DemoDetectedIntent;
  reason: string | null;
  clarificationQuestion: string | null;
  matchedAppointment: MatchedAppointment;
}) {
  if (input.intent === "reschedule_appointment") {
    return "propose_reschedule";
  }

  if (input.intent === "cancel_appointment") {
    return "approve_reply";
  }

  if (input.intent === "appointment_lookup") {
    return "approve_reply";
  }

  if (input.clarificationQuestion) {
    return "ask_clarification";
  }

  if (input.intent === "new_appointment" && input.reason) {
    return "propose_slots";
  }

  if (input.intent === "delay_notice" || input.intent === "callback_request") {
    return "approve_reply";
  }

  return "manual_review";
}

function buildMissingFields(input: {
  locale: SupportedLocale;
  intent: DemoDetectedIntent;
  reason: string | null;
  sender: SenderIdentity;
  matchedAppointment: MatchedAppointment;
  calendar: DemoCalendarResult;
  clarificationQuestion: string | null;
}) {
  const fields: string[] = [];

  if (input.intent === "new_appointment" && !input.reason) {
    fields.push(input.locale === "it" ? "motivo appuntamento" : "appointment reason");
  }

  if (input.intent === "new_appointment" && !input.calendar.requestedDateTimeText) {
    fields.push(input.locale === "it" ? "giorno o fascia oraria" : "day or time window");
  }

  return fields;
}

function buildSummary(input: {
  locale: SupportedLocale;
  intent: DemoDetectedIntent;
  calendar: DemoCalendarResult;
  customerText: string;
  reason: string | null;
  sender: SenderIdentity;
  matchedAppointment: MatchedAppointment;
  requestedNewDateText: string | null;
  recommendedNextStep: RecommendedNextStep;
  urgency: Urgency;
}) {
  const delayMinutes = extractDelayMinutes(input.customerText);

  if (input.locale === "en") {
    if (input.intent === "delay_notice") {
      return delayMinutes
        ? `The customer is running about ${delayMinutes} minutes late and asks to talk later.`
        : "The customer is running late and asks to talk later.";
    }

    if (input.intent === "callback_request") {
      return "Callback request.";
    }

    if (input.intent === "cancel_appointment") {
      return "The customer is asking to cancel linked demo appointments.";
    }

    if (input.intent === "reschedule_appointment") {
      const customerName = input.matchedAppointment.customerName;

      if (input.requestedNewDateText) {
        return customerName
          ? `Request to move the demo appointment for ${customerName} to ${input.requestedNewDateText}.`
          : `Request to move the linked demo appointment to ${input.requestedNewDateText}.`;
      }

      return customerName
        ? `Request to move the demo appointment for ${customerName}.`
        : "Request to move the linked demo appointment.";
    }

    if (input.intent === "appointment_lookup") {
      return "The customer is asking when their appointment is scheduled.";
    }

    if (input.intent === "new_appointment") {
      if (input.urgency === "urgent" && input.reason) {
        return buildUrgentAppointmentSummary(input);
      }

      return buildNewAppointmentSummary(input);
    }

    return "Request to review before preparing an action.";
  }

  if (input.intent === "delay_notice") {
    return buildDelaySummary(input);
  }

  if (input.intent === "callback_request") {
    return "Richiesta di richiamata.";
  }

  if (input.intent === "cancel_appointment") {
    return "Il cliente chiede di annullare gli appuntamenti demo collegati.";
  }

  if (input.intent === "reschedule_appointment") {
    const customerName = input.matchedAppointment.customerName;

    if (input.requestedNewDateText) {
      return customerName
        ? `Richiesta di spostare l'appuntamento demo collegato di ${customerName} a ${input.requestedNewDateText}.`
        : `Richiesta di spostare l'appuntamento demo collegato a ${input.requestedNewDateText}.`;
    }

    return customerName
      ? `Richiesta di spostare l'appuntamento demo collegato di ${customerName}.`
      : "Richiesta di spostare l'appuntamento demo collegato.";
  }

  if (input.intent === "appointment_lookup") {
    return "Il cliente chiede quando è fissato il suo appuntamento.";
  }

  if (input.intent === "new_appointment") {
    if (input.urgency === "urgent" && input.reason) {
      return buildUrgentAppointmentSummary(input);
    }

    return buildNewAppointmentSummary(input);
  }

  return "Richiesta da rivedere prima di preparare un'azione.";
}

function buildNewAppointmentSummary(input: {
  locale: SupportedLocale;
  reason: string | null;
  sender: SenderIdentity;
  calendar: DemoCalendarResult;
}) {
  const customerName = firstName(senderDisplayName(input.sender) ?? input.sender.senderName);

  if (input.locale === "en") {
    const customer = customerName ?? "The customer";
    const reasonText = input.reason ? formatThirdPartyReason(input.reason, input.locale) : "the appointment";
    const dateText = input.calendar.requestedDateTimeText ? ` for ${input.calendar.requestedDateTimeText}` : "";

    return input.reason
      ? `${customer} asks for availability${dateText} for an appointment related to ${reasonText}.`
      : `${customer} asks for an appointment, but the reason is missing.`;
  }

  const customer = customerName ?? "Il cliente";
  const dateText = input.calendar.requestedDateTimeText ? ` per ${input.calendar.requestedDateTimeText}` : "";
  const reasonText = input.reason ? formatThirdPartyReason(input.reason, input.locale) : null;

  return reasonText
    ? `${customer} chiede disponibilità${dateText} per un appuntamento legato a ${reasonText}.`
    : `${customer} chiede un appuntamento, ma manca il motivo.`;
}

function buildDelaySummary(input: {
  locale: SupportedLocale;
  customerText: string;
  sender: SenderIdentity;
}) {
  const customerName = firstName(senderDisplayName(input.sender) ?? input.sender.senderName);
  const normalized = normalizeText(input.customerText);
  const delayMinutes = extractDelayMinutes(input.customerText);
  const hasTraffic = /(?:\btraffico\b|stuck in traffic)/.test(normalized);
  const asksLater = /(?:sentir(?:mi|ci)\s+piu\s+tardi|possiamo\s+sentirci\s+piu\s+tardi|chiamarci\s+piu\s+tardi|sentirci\s+dopo|talk later|speak later)/.test(normalized);

  if (input.locale === "en") {
    const customer = customerName ?? "The customer";

    if (hasTraffic && asksLater) {
      return `${customer} says they are running late/stuck in traffic and asks to talk later.`;
    }

    if (hasTraffic) {
      return `${customer} says they are stuck in traffic and asks to talk later.`;
    }

    return delayMinutes
      ? `${customer} is running about ${delayMinutes} minutes late and asks to talk later.`
      : `${customer} is running late and asks to talk later.`;
  }

  const customer = customerName ?? "Il cliente";

  if (hasTraffic && asksLater) {
    return `${customer} avvisa che è in ritardo/bloccato nel traffico e chiede di sentirsi più tardi.`;
  }

  if (hasTraffic) {
    return `${customer} avvisa che è bloccato nel traffico e chiede di sentirsi più tardi.`;
  }

  return delayMinutes
    ? `${customer} avvisa che è in ritardo di circa ${delayMinutes} minuti e chiede di sentirsi più tardi.`
    : `${customer} avvisa che è in ritardo e chiede di sentirsi più tardi.`;
}

function buildUrgentAppointmentSummary(input: {
  locale: SupportedLocale;
  reason: string | null;
  sender: SenderIdentity;
  customerText: string;
}) {
  const customerName = firstName(senderDisplayName(input.sender) ?? input.sender.senderName);
  const customer = customerName ?? (input.locale === "it" ? "Il cliente" : "The customer");
  const normalized = normalizeText(input.customerText);
  const firstAvailable = hasFirstAvailabilitySignal(normalized);

  if (input.locale === "en") {
    if (input.reason === "urgent cavity-related appointment") {
      return `${customer} asks for the earliest availability for an urgent cavity-related appointment.`;
    }

    if (input.reason === "urgent tooth pain appointment") {
      return `${customer} asks for an urgent appointment for tooth pain.`;
    }

    const reasonText = input.reason ? formatReasonForReply(input.reason, input.locale) : "an urgent appointment";
    return firstAvailable
      ? `${customer} asks for the earliest availability for ${reasonText}.`
      : `${customer} asks for ${reasonText}.`;
  }

  if (input.reason === "urgenza per carie") {
    return `${customer} chiede la prima disponibilità utile per un’urgenza legata a una carie.`;
  }

  if (input.reason === "urgenza per dolore ai denti") {
    return `${customer} chiede un appuntamento urgente per dolore ai denti.`;
  }

  const reasonText = input.reason ? formatReasonForReply(input.reason, input.locale) : "un appuntamento urgente";
  return firstAvailable
    ? `${customer} chiede la prima disponibilità utile per ${reasonText}.`
    : `${customer} chiede ${reasonText}.`;
}

function buildSuggestedReply(input: {
  locale: SupportedLocale;
  intent: DemoDetectedIntent;
  calendar: DemoCalendarResult;
  reason: string | null;
  sender: SenderIdentity;
  matchedAppointment: MatchedAppointment;
  requestedNewDateText: string | null;
  clarificationQuestion: string | null;
  recommendedNextStep: RecommendedNextStep;
  urgency: Urgency;
}) {
  if (input.clarificationQuestion) {
    return input.clarificationQuestion;
  }

  const alternatives = formatAlternativeTimes(input.calendar, input.locale);

  if (input.locale === "en") {
    if (input.intent === "appointment_lookup") {
      const startsAt = input.matchedAppointment.startsAtText ?? "tomorrow at 3:00 PM";
      return `Of course. Your appointment is scheduled for ${startsAt}. See you then.`;
    }

    if (input.intent === "delay_notice") {
      return "No problem. Let’s talk in about an hour so we have enough time. Does that work for you?";
    }

    if (input.intent === "callback_request") {
      return "Sure, I can call you back. Let me know if you prefer morning or afternoon.";
    }

    if (input.intent === "cancel_appointment") {
      return "Of course, no problem. I’ll prepare the cancellation, but nothing will be changed without confirmation.";
    }

    if (input.intent === "reschedule_appointment") {
      if (input.calendar.scenario === "reschedule_day_after_tomorrow") {
        const times = formatAlternativeClockTimes(input.calendar, input.locale);
        return `Of course, we can move the appointment to the day after tomorrow. I have availability at ${times}. Which time works best for you?`;
      }

      if (input.calendar.scenario === "thursday_15") {
        return `Of course, we can move Thursday’s 3 PM appointment. I can offer ${alternatives}. Which one works best for you?`;
      }

      if (input.calendar.scenario === "reschedule_tomorrow") {
        return `Of course, we can reschedule tomorrow’s appointment. I can offer ${alternatives}. Which one works best for you?`;
      }

      return `Of course, we can move the appointment. I can offer ${alternatives}. Which one works best for you?`;
    }

    if (input.intent === "new_appointment") {
      if (input.urgency === "urgent" && input.reason) {
        const reasonText = formatReasonForReply(input.reason, input.locale);
        return `Hi, of course. For ${reasonText}, I can offer the first available slot today at 4:30 PM or tomorrow at 9:30 AM. Which one works best for you?`;
      }

      const reasonText = input.reason ? formatThirdPartyReason(input.reason, input.locale) : "the appointment";
      const slotText = usesClockOnlyAlternatives(input.calendar)
        ? `at ${formatAlternativeClockTimes(input.calendar, input.locale)}`
        : alternatives;
      return `Sure, for ${reasonText} I have availability ${input.calendar.requestedDateTimeText ? `${input.calendar.requestedDateTimeText} ` : ""}${slotText}. Which one works better for you?`;
    }

    return "Thanks, I have noted your request and will review it before preparing any action.";
  }

  if (input.intent === "appointment_lookup") {
    const firstName = getReplyFirstName(input.sender);
    const greeting = firstName ? `Ciao ${firstName}, certo.` : "Certo.";
    const startsAt = input.matchedAppointment.startsAtText ?? "domani alle 15:00";
    return `${greeting} Il tuo appuntamento risulta fissato per ${startsAt}. A presto.`;
  }

  if (input.intent === "delay_notice") {
    const firstName = getReplyFirstName(input.sender);
    const greeting = firstName ? `Certo ${firstName}` : "Certo";
    return `${greeting}, nessun problema. Sentiamoci tra circa un’oretta, così abbiamo più margine. Ti va bene?`;
  }

  if (input.intent === "callback_request") {
    return "Certo, posso richiamarti. Dimmi pure se preferisci mattina o pomeriggio.";
  }

  if (input.intent === "cancel_appointment") {
    return "Certo, nessun problema. Preparo la cancellazione, ma nessuna modifica viene fatta senza conferma.";
  }

  if (input.intent === "reschedule_appointment") {
    if (input.calendar.scenario === "reschedule_day_after_tomorrow") {
      const firstName = getReplyFirstName(input.sender);
      const greeting = firstName ? `Certo ${firstName}` : "Certo";
      const times = formatAlternativeClockTimes(input.calendar, input.locale);

      return `${greeting}, possiamo spostare l'appuntamento a dopodomani. Ho disponibilità ${times}. Quale orario preferisci?`;
    }

    if (input.calendar.scenario === "thursday_15") {
      return `Certo, possiamo spostare l'appuntamento di giovedì alle 15. Ti propongo ${alternatives}. Quale preferisci?`;
    }

    if (input.calendar.scenario === "reschedule_tomorrow") {
      const firstName = getReplyFirstName(input.sender);
      const greeting = firstName ? `Certo ${firstName}` : "Certo";
      return `${greeting}, possiamo posticipare l’incontro di domani. Ti propongo ${alternatives}. Quale orario preferisci?`;
    }

    return `Certo, possiamo rimandare l'appuntamento. Ti propongo ${alternatives}. Quale preferisci?`;
  }

  if (input.intent === "new_appointment") {
    if (input.urgency === "urgent" && input.reason) {
      const firstName = getReplyFirstName(input.sender);
      const greeting = firstName ? `Ciao ${firstName}, certo.` : "Certo.";
      const reasonText = formatReasonForReply(input.reason, input.locale);
      return `${greeting} Per ${reasonText} posso proporti il primo slot utile oggi alle 16:30 oppure domani alle 9:30. Quale orario preferisci?`;
    }

    const reasonText = input.reason ? formatThirdPartyReason(input.reason, input.locale) : "l'appuntamento";
    const firstName = getReplyFirstName(input.sender);
    const greeting = firstName ? `Certo ${firstName},` : "Certo,";
    const slotText = usesClockOnlyAlternatives(input.calendar)
      ? formatAlternativeClockTimes(input.calendar, input.locale)
      : alternatives;
    return `${greeting} per ${reasonText} ${input.calendar.requestedDateTimeText ? `${input.calendar.requestedDateTimeText} ` : ""}ho disponibilità ${slotText}. Quale orario preferisci?`;
  }

  return "Grazie, ho preso nota della richiesta e la rivedo prima di preparare qualsiasi azione.";
}

function buildSafetyNotes(locale: SupportedLocale) {
  return locale === "it"
    ? [
        "Questa è una simulazione.",
        "Nessun messaggio viene inviato e nessun calendario viene modificato.",
      ]
    : [
        "This is a simulation.",
        "No message is sent and no calendar is changed.",
      ];
}

function calculateFallbackConfidence(
  text: string,
  intent: DemoDetectedIntent,
  calendar: DemoCalendarResult,
  sender: SenderIdentity,
  matchedAppointment: MatchedAppointment,
  reason: string | null,
) {
  if (!text.trim()) {
    return 0;
  }

  const baseByIntent: Record<DemoDetectedIntent, number> = {
    new_appointment: reason ? 0.9 : 0.82,
    reschedule_appointment: matchedAppointment.found ? 0.94 : 0.82,
    delay_notice: matchedAppointment.found ? 0.94 : 0.9,
    cancel_appointment: 0.96,
    appointment_lookup: matchedAppointment.found ? 0.96 : 0.88,
    callback_request: 0.86,
    manual_review: 0.42,
  };
  const scenarioBoost = calendar.scenario !== "none" && calendar.scenario !== "generic_appointment" ? 0.04 : 0;
  const senderBoost = sender.customerIdentified ? 0.02 : 0;

  return Math.min(0.97, baseByIntent[intent] + scenarioBoost + senderBoost);
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

  if (intent === "appointment_lookup") {
    return channel === "whatsapp"
      ? "send_whatsapp_reply"
      : channel === "quick_call"
        ? "send_call_followup_whatsapp"
        : "send_email_reply";
  }

  if (intent === "reschedule_appointment") {
    return needsMoreInfo ? "request_more_information" : "propose_calendar_reschedule";
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

function formatAlternativeTimes(calendar: DemoCalendarResult, locale: SupportedLocale) {
  if (calendar.alternatives.length === 0) {
    return locale === "it" ? "uno slot alternativo" : "an alternative slot";
  }

  return calendar.alternatives
    .map((slot, index) => {
      if (calendar.scenario === "reschedule_day_after_tomorrow") {
        const time = formatSlotTime(slot.startsAt, locale);
        return locale === "it" ? `dopodomani alle ${time}` : `day after tomorrow at ${time}`;
      }

      if (
        calendar.scenario === "tomorrow" ||
        calendar.scenario === "tomorrow_morning" ||
        calendar.scenario === "tomorrow_afternoon" ||
        calendar.scenario === "tomorrow_15"
      ) {
        return formatSlotTime(slot.startsAt, locale);
      }

      if (
        calendar.scenario === "reschedule_tomorrow" &&
        index === 1
      ) {
        const time = formatSlotTime(slot.startsAt, locale);
        return locale === "it" ? `dopodomani alle ${time}` : `day after tomorrow at ${time}`;
      }

      if (
        index === 0 &&
        (calendar.scenario === "reschedule_tomorrow" || calendar.scenario === "reschedule_generic")
      ) {
        const time = formatSlotTime(slot.startsAt, locale);
        return locale === "it" ? `domani alle ${time}` : `tomorrow at ${time}`;
      }

      return formatSlotDayTime(slot.startsAt, locale);
    })
    .join(locale === "it" ? " oppure " : " or ");
}

function usesClockOnlyAlternatives(calendar: DemoCalendarResult) {
  return calendar.scenario === "tomorrow" ||
    calendar.scenario === "tomorrow_morning" ||
    calendar.scenario === "tomorrow_afternoon" ||
    calendar.scenario === "tomorrow_15";
}

function formatAlternativeClockTimes(calendar: DemoCalendarResult, locale: SupportedLocale) {
  if (calendar.alternatives.length === 0) {
    return locale === "it" ? "alle 9:30" : "9:30 AM";
  }

  return calendar.alternatives
    .map((slot) => {
      const time = formatSlotTime(slot.startsAt, locale);
      return locale === "it" ? `alle ${time}` : time;
    })
    .join(locale === "it" ? " oppure " : " or ");
}

function getReplyFirstName(sender: SenderIdentity) {
  if (sender.contact?.firstName) {
    return sender.contact.firstName;
  }

  if (!sender.customerIdentified || !sender.senderName) {
    return null;
  }

  return sender.senderName.trim().split(/\s+/)[0] ?? null;
}

function formatSlotTime(value: string, locale: SupportedLocale) {
  const formatted = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

  const withoutLeadingZero = formatted.replace(/^0/, "");

  return locale === "it" ? withoutLeadingZero.toLowerCase() : withoutLeadingZero;
}

function formatSlotDayTime(value: string, locale: SupportedLocale) {
  const date = new Date(value);
  const weekday = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    weekday: "long",
  }).format(date);
  const time = formatSlotTime(value, locale);

  return locale === "it"
    ? `${weekday.toLowerCase()} alle ${time}`
    : `${weekday} at ${time}`;
}

function detectRequestedDateTimeText(text: string, locale: SupportedLocale) {
  const normalized = normalizeText(text);

  if (hasDayAfterTomorrow(normalized)) {
    return locale === "it" ? "dopodomani" : "day after tomorrow";
  }

  if (hasTomorrow(normalized) && hasAfternoon(normalized)) {
    return locale === "it" ? "domani pomeriggio" : "tomorrow afternoon";
  }

  if (hasTomorrow(normalized) && hasMorning(normalized)) {
    return locale === "it" ? "domani mattina" : "tomorrow morning";
  }

  if (hasNextWeek(normalized)) {
    return locale === "it" ? "prossima settimana" : "next week";
  }

  if (hasThursday(normalized) && hasThreePm(normalized)) {
    return locale === "it" ? "giovedì alle 15:00" : "Thursday at 3:00 PM";
  }

  if (hasTomorrow(normalized) && hasThreePm(normalized)) {
    return locale === "it" ? "domani alle 15:00" : "tomorrow at 3:00 PM";
  }

  if (hasTomorrow(normalized)) {
    return locale === "it" ? "domani" : "tomorrow";
  }

  return null;
}

function formatAppointmentStartsAt(appointment: DemoAppointment, locale: SupportedLocale) {
  return formatSlotDayTime(appointmentDate(appointment).toISOString(), locale);
}

function appointmentDate(appointment: DemoAppointment) {
  const now = new Date();

  if (appointment.day === "tomorrow") {
    return atLocal(dateKey(addDays(now, 1)), appointment.hour, appointment.minute);
  }

  if (appointment.day === "next_tuesday") {
    return atLocal(dateKey(addDays(nextWeekStart(now), 1)), appointment.hour, appointment.minute);
  }

  return atLocal(dateKey(nextWeekday(now, 4)), appointment.hour, appointment.minute);
}

function hasTomorrow(text: string) {
  return !hasDayAfterTomorrow(text) && /\b(domani|tomorrow)\b/.test(text);
}

function hasDayAfterTomorrow(text: string) {
  return /\b(dopodomani|dopo\s+domani|day\s+after\s+tomorrow)\b/.test(text);
}

function hasToday(text: string) {
  return /\b(oggi|today)\b/.test(text);
}

function hasAfternoon(text: string) {
  return /\b(pomeriggio|afternoon)\b/.test(text);
}

function hasMorning(text: string) {
  return /\b(mattina|mattino|morning)\b/.test(text);
}

function hasThursday(text: string) {
  return /\b(giovedi|thursday)\b/.test(text);
}

function hasFriday(text: string) {
  return /\b(venerdi|friday)\b/.test(text);
}

function hasNextWeek(text: string) {
  return /\b(prossima settimana|settimana prossima|settimana prox|next week)\b/.test(text);
}

function hasThreePm(text: string) {
  return /\b(alle\s*)?15(?::00)?\b/.test(text) || /\b3\s*(pm|p\.m\.)\b/.test(text);
}

function extractDelayMinutes(text: string) {
  const match = normalizeText(text).match(/\b(\d{1,3})\s*(?:minuti|min|minutes|minute)\b/);
  return match ? Number(match[1]) : null;
}

function toSlot(day: Date, hour: number, minute: number): AvailabilitySlot {
  const startsAt = atLocal(dateKey(day), hour, minute);
  const endsAt = addMinutes(startsAt, 30);

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes: 30,
    provider: "all",
    calendarAccountId: null,
  };
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

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60_000);
}

function normalizeContact(value: string) {
  return value.includes("@") ? value.toLowerCase() : normalizePhone(value);
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
