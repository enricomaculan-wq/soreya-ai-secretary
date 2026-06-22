import type {
  AIAnalysisSource,
  AIAppointmentAnalysis,
  AIReplyChannel,
  AIReplyDraft,
  AvailabilitySlot,
  EmergencyModeRequest,
  Json,
  NormalizedCalendarEvent,
  NormalizedEmailMessage,
  NormalizedWhatsAppMessage,
  OrganizationBrainContext,
  QuickCallAnalysis,
  UserRule,
} from "@soreya/shared";
import { z } from "zod";

import { buildBrainSystemPromptAddendum } from "./brain";
import { callOpenAIJson, readOpenAIConfig } from "./openai-client";

export const SOREYA_APPOINTMENT_SYSTEM_PROMPT = [
  "Sei Soreya, un segretario AI operativo per email, WhatsApp Business, calendario e note telefoniche.",
  "Devi estrarre richieste di appuntamento, rinvio, cancellazione o richiamata con prudenza.",
  "Date e orari ambigui non vanno inventati: se mancano dati, imposta needsMoreInfo true e compila missingFields.",
  "Non devi mai dire che hai inviato messaggi, creato eventi, cancellato o modificato calendari.",
  "Non devi promettere che qualcosa sia gia stato eseguito.",
  "Tutte le risposte sono bozze da approvare dall'utente.",
  "Rispondi nella stessa lingua del messaggio utente; se non e chiara, usa italiano.",
  "Tono professionale, breve e umano.",
  "Produci solo JSON valido, senza markdown.",
].join("\n");

export type AnalyzeAppointmentTextInput = {
  source: AIAnalysisSource;
  text: string;
  timezone?: string;
  now?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  subject?: string | null;
  fallbackAnalysis: AIAppointmentAnalysis;
  context?: Json;
};

export type GenerateReplyDraftInput = {
  source: AIAnalysisSource;
  channel: AIReplyChannel;
  recipient?: string | null;
  subject?: string | null;
  originalText: string;
  analysis: AIAppointmentAnalysis;
  alternatives?: AvailabilitySlot[];
  fallbackBody: string;
  fallbackSubject?: string | null;
  timezone?: string;
};

export type GenerateEmergencyMessageInput = {
  request: EmergencyModeRequest;
  event: NormalizedCalendarEvent;
  recipientName?: string | null;
  fallbackBody: string;
};

const AIAppointmentAnalysisSchema = z.object({
  isAppointmentRequest: z.boolean(),
  intentType: z.string(),
  confidence: z.number().min(0).max(1),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerPhone: z.string().nullable(),
  requestedDateTimeText: z.string().nullable(),
  requestedStartsAt: z.string().nullable(),
  requestedEndsAt: z.string().nullable(),
  timezone: z.string().nullable(),
  reason: z.string().nullable(),
  needsMoreInfo: z.boolean(),
  missingFields: z.array(z.string()),
  extractedConstraints: z.record(z.string(), z.unknown()),
  priority: z.enum(["low", "normal", "high"]),
  suggestedReplyTone: z.enum(["professional", "friendly", "short", "apologetic"]),
  suggestedReplyBody: z.string().nullable(),
  safetyNotes: z.array(z.string()),
});

const AIReplyDraftSchema = z.object({
  channel: z.enum(["email", "whatsapp", "calendar", "manual_review"]),
  recipient: z.string().nullable(),
  subject: z.string().nullable(),
  body: z.string(),
  tone: z.enum(["professional", "friendly", "short", "apologetic"]),
  needsApproval: z.boolean(),
  safetyNotes: z.array(z.string()),
});

function resolveAppointmentSystemPrompt(input: AnalyzeAppointmentTextInput) {
  const brainContext = readBrainContextFromJson(input.context);

  if (!brainContext) {
    return SOREYA_APPOINTMENT_SYSTEM_PROMPT;
  }

  return `${SOREYA_APPOINTMENT_SYSTEM_PROMPT}\n\n${buildBrainSystemPromptAddendum(brainContext)}`;
}

export async function analyzeAppointmentTextWithAI(
  input: AnalyzeAppointmentTextInput,
): Promise<AIAppointmentAnalysis> {
  const result = await callOpenAIJson({
    systemPrompt: resolveAppointmentSystemPrompt(input),
    schema: AIAppointmentAnalysisSchema,
    userPrompt: JSON.stringify({
      task: "Analyze this operational appointment text for Soreya.",
      source: input.source,
      timezone: input.timezone ?? input.fallbackAnalysis.timezone,
      now: input.now ?? new Date().toISOString(),
      subject: input.subject ?? null,
      customerName: input.customerName ?? input.fallbackAnalysis.customerName,
      customerEmail: input.customerEmail ?? input.fallbackAnalysis.customerEmail,
      customerPhone: input.customerPhone ?? input.fallbackAnalysis.customerPhone,
      text: input.text,
      context: input.context ?? {},
      requiredOutput: {
        isAppointmentRequest: "boolean",
        intentType: "new_appointment | reschedule_appointment | cancel_appointment | callback_request | generic_note | unknown",
        requestedStartsAt: "ISO datetime or null",
        requestedEndsAt: "ISO datetime or null",
        suggestedReplyBody: "draft only, never claims execution",
      },
    }),
  });

  if (!result.data) {
    return withAIMetadata(input.fallbackAnalysis, result);
  }

  return withAIMetadata(
    {
      ...result.data,
      extractedConstraints: result.data.extractedConstraints as Json,
    },
    result,
  );
}

export async function generateReplyDraftWithAI(input: GenerateReplyDraftInput): Promise<AIReplyDraft> {
  const fallback = fallbackReplyDraft(input);
  const result = await callOpenAIJson({
    systemPrompt: SOREYA_APPOINTMENT_SYSTEM_PROMPT,
    schema: AIReplyDraftSchema,
    userPrompt: JSON.stringify({
      task: "Generate a safe reply draft for Soreya. It must require approval and never claim execution.",
      source: input.source,
      channel: input.channel,
      recipient: input.recipient ?? null,
      subject: input.subject ?? null,
      timezone: input.timezone ?? input.analysis.timezone,
      originalText: input.originalText,
      analysis: input.analysis,
      alternatives: input.alternatives ?? [],
    }),
  });

  if (!result.data) {
    return withReplyMetadata(fallback, result);
  }

  return withReplyMetadata(result.data, result);
}

export async function analyzeEmailWithAI(
  message: NormalizedEmailMessage,
  context: { timezone?: string; userRules?: UserRule[]; fallbackAnalysis: AIAppointmentAnalysis },
): Promise<AIAppointmentAnalysis> {
  return analyzeAppointmentTextWithAI({
    source: "email",
    text: [message.subject, message.snippet, message.bodyText].filter(Boolean).join("\n"),
    subject: message.subject,
    timezone: context.timezone,
    customerName: message.fromName,
    customerEmail: message.fromEmail,
    fallbackAnalysis: context.fallbackAnalysis,
    context: {
      userRules: context.userRules?.map((rule) => ({ title: rule.title, instruction: rule.instruction })),
      fromEmail: message.fromEmail,
      provider: message.provider,
    },
  });
}

export async function analyzeWhatsAppWithAI(
  message: NormalizedWhatsAppMessage,
  context: { timezone?: string; userRules?: UserRule[]; fallbackAnalysis: AIAppointmentAnalysis },
): Promise<AIAppointmentAnalysis> {
  return analyzeAppointmentTextWithAI({
    source: "whatsapp",
    text: message.textBody ?? "",
    timezone: context.timezone,
    customerName: message.fromName,
    customerPhone: message.fromPhone,
    fallbackAnalysis: context.fallbackAnalysis,
    context: {
      userRules: context.userRules?.map((rule) => ({ title: rule.title, instruction: rule.instruction })),
      provider: message.provider,
      messageType: message.messageType,
    },
  });
}

export async function analyzeQuickCallWithAI(
  rawText: string,
  context: {
    timezone?: string;
    fallbackAnalysis: QuickCallAnalysis;
    brainContext?: OrganizationBrainContext;
  },
): Promise<QuickCallAnalysis> {
  const fallback = quickCallToAIAppointment(context.fallbackAnalysis);
  const analysis = await analyzeAppointmentTextWithAI({
    source: "quick_call",
    text: rawText,
    timezone: context.timezone,
    fallbackAnalysis: fallback,
    context: context.brainContext
      ? ({
          brain: {
            settings: context.brainContext.settings,
            services: context.brainContext.services,
          },
        } as Json)
      : undefined,
  });

  return {
    intentType: toQuickCallIntentType(analysis.intentType),
    confidence: analysis.confidence,
    customerName: analysis.customerName,
    customerEmail: analysis.customerEmail,
    customerPhone: analysis.customerPhone,
    requestedDateTimeText: analysis.requestedDateTimeText,
    requestedStartsAt: analysis.requestedStartsAt,
    requestedEndsAt: analysis.requestedEndsAt,
    reason: analysis.reason,
    needsMoreInfo: analysis.needsMoreInfo,
    missingFields: analysis.missingFields,
    extractedConstraints: analysis.extractedConstraints,
    suggestedReplyChannel: analysis.customerPhone ? "whatsapp" : analysis.customerEmail ? "email" : "manual_review",
    suggestedReplyBody: analysis.suggestedReplyBody,
    priority: analysis.priority,
    suggestedReplyTone: analysis.suggestedReplyTone,
    safetyNotes: analysis.safetyNotes,
    aiProvider: analysis.aiProvider,
    aiModel: analysis.aiModel,
    usedFallback: analysis.usedFallback,
  };
}

export async function generateEmergencyMessageWithAI(input: GenerateEmergencyMessageInput): Promise<AIReplyDraft> {
  return generateReplyDraftWithAI({
    source: "emergency",
    channel: "manual_review",
    recipient: input.recipientName ?? null,
    originalText: JSON.stringify({
      request: input.request,
      event: {
        title: input.event.title,
        startsAt: input.event.startsAt,
        endsAt: input.event.endsAt,
      },
    }),
    analysis: {
      isAppointmentRequest: true,
      intentType: input.request.type,
      confidence: 0.8,
      customerName: input.recipientName ?? null,
      customerEmail: null,
      customerPhone: null,
      requestedDateTimeText: input.event.startsAt,
      requestedStartsAt: input.event.startsAt,
      requestedEndsAt: input.event.endsAt,
      timezone: input.event.timezone,
      reason: input.request.reason,
      needsMoreInfo: false,
      missingFields: [],
      extractedConstraints: {},
      priority: "high",
      suggestedReplyTone: input.request.messageTone ?? "professional",
      suggestedReplyBody: input.fallbackBody,
      safetyNotes: ["Draft only. No calendar or message action has been executed."],
      aiProvider: "heuristic",
      aiModel: readOpenAIConfig().model,
      usedFallback: true,
    },
    fallbackBody: input.fallbackBody,
  });
}

function fallbackReplyDraft(input: GenerateReplyDraftInput): AIReplyDraft {
  return {
    channel: input.channel,
    recipient: input.recipient ?? null,
    subject: input.fallbackSubject ?? input.subject ?? null,
    body: input.analysis.suggestedReplyBody ?? input.fallbackBody,
    tone: input.analysis.suggestedReplyTone ?? "professional",
    needsApproval: true,
    safetyNotes: [
      "AI suggestions are drafts and require approval.",
      "Soreya does not send messages or modify calendars automatically.",
      ...(input.analysis.safetyNotes ?? []),
    ],
    aiProvider: "heuristic",
    aiModel: readOpenAIConfig().model,
    usedFallback: true,
  };
}

function withAIMetadata(
  analysis: Omit<AIAppointmentAnalysis, "aiProvider" | "aiModel" | "usedFallback"> | AIAppointmentAnalysis,
  result: { aiProvider: "openai" | "heuristic"; aiModel: string | null; usedFallback: boolean; error: string | null },
): AIAppointmentAnalysis {
  return {
    ...analysis,
    safetyNotes: [
      ...(analysis.safetyNotes ?? []),
      ...(result.error ? [`AI fallback: ${result.error}`] : []),
      "AI suggestions are drafts and require approval.",
    ],
    aiProvider: result.aiProvider,
    aiModel: result.aiModel,
    usedFallback: result.usedFallback,
  };
}

function withReplyMetadata(
  draft: Omit<AIReplyDraft, "aiProvider" | "aiModel" | "usedFallback"> | AIReplyDraft,
  result: { aiProvider: "openai" | "heuristic"; aiModel: string | null; usedFallback: boolean; error: string | null },
): AIReplyDraft {
  return {
    ...draft,
    needsApproval: true,
    safetyNotes: [
      ...(draft.safetyNotes ?? []),
      ...(result.error ? [`AI fallback: ${result.error}`] : []),
      "Soreya does not send messages or modify calendars automatically.",
    ],
    aiProvider: result.aiProvider,
    aiModel: result.aiModel,
    usedFallback: result.usedFallback,
  };
}

function quickCallToAIAppointment(analysis: QuickCallAnalysis): AIAppointmentAnalysis {
  return {
    isAppointmentRequest: ["new_appointment", "reschedule_appointment", "cancel_appointment", "callback_request"].includes(analysis.intentType),
    intentType: analysis.intentType,
    confidence: analysis.confidence,
    customerName: analysis.customerName,
    customerEmail: analysis.customerEmail,
    customerPhone: analysis.customerPhone,
    requestedDateTimeText: analysis.requestedDateTimeText,
    requestedStartsAt: analysis.requestedStartsAt,
    requestedEndsAt: analysis.requestedEndsAt,
    timezone: null,
    reason: analysis.reason,
    needsMoreInfo: analysis.needsMoreInfo,
    missingFields: analysis.missingFields,
    extractedConstraints: analysis.extractedConstraints,
    priority: analysis.priority ?? "normal",
    suggestedReplyTone: analysis.suggestedReplyTone ?? "professional",
    suggestedReplyBody: analysis.suggestedReplyBody,
    safetyNotes: analysis.safetyNotes ?? [],
    aiProvider: analysis.aiProvider ?? "heuristic",
    aiModel: analysis.aiModel ?? readOpenAIConfig().model,
    usedFallback: analysis.usedFallback ?? true,
  };
}

function readBrainContextFromJson(context: Json | undefined): OrganizationBrainContext | null {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return null;
  }

  const brain = context.brain;

  if (!brain || typeof brain !== "object" || Array.isArray(brain)) {
    return null;
  }

  const settings = brain.settings;
  const services = brain.services;

  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }

  if (!Array.isArray(services)) {
    return null;
  }

  return {
    settings: settings as OrganizationBrainContext["settings"],
    services: services as OrganizationBrainContext["services"],
  };
}

function toQuickCallIntentType(value: string): QuickCallAnalysis["intentType"] {
  if (
    value === "new_appointment"
    || value === "reschedule_appointment"
    || value === "cancel_appointment"
    || value === "callback_request"
    || value === "generic_note"
    || value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}
