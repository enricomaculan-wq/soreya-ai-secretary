import {
  analyzeQuickCallNote,
  analyzeQuickCallWithAI,
  buildQuickCallSuggestedActions,
  enrichWithOrganizationBrain,
  finalizeSchedulingReplyForBrain,
  suggestQuickCallAlternativeSlots,
} from "@soreya/ai";
import {
  createAppointmentRequestFromCallNote,
  createQuickCallNote,
  createQuickCallSuggestedActions,
  getCachedCalendarEvents,
  getOrganizationBrainContext,
  updateQuickCallNoteAnalysis,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type {
  AvailabilitySlot,
  QuickCallAnalysis,
  QuickCallResult,
  QuickCallSuggestedActionDraft,
  UserRule,
} from "@soreya/shared";
import { NextResponse } from "next/server";

type QuickCallPreview = Omit<QuickCallResult, "suggestedActions"> & {
  suggestedActions: QuickCallSuggestedActionDraft[];
};

export function quickCallJsonError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}

export function readQuickCallRawText(body: Record<string, unknown>): string {
  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";

  if (rawText.length < 3) {
    throw new Error("rawText must contain at least 3 characters.");
  }

  return rawText;
}

export async function buildQuickCallPreview(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    rawText: string;
    timezone: string;
  },
): Promise<QuickCallPreview> {
  const baseAnalysis = await analyzeQuickCallWithBrain(supabase, input);
  const alternatives = await getQuickCallAlternatives(supabase, input, baseAnalysis);
  const analysis = finalizeQuickCallScheduling(baseAnalysis, alternatives, input);
  const suggestedActions = buildQuickCallSuggestedActions(null, analysis, alternatives);

  return {
    callNote: null,
    appointmentRequest: null,
    suggestedActions,
    warnings: buildWarnings(analysis),
    alternatives,
  };
}

export async function persistQuickCallPlan(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    rawText: string;
    timezone: string;
  },
): Promise<QuickCallResult> {
  const baseAnalysis = await analyzeQuickCallWithBrain(supabase, input);
  const alternatives = await getQuickCallAlternatives(supabase, input, baseAnalysis);
  const analysis = finalizeQuickCallScheduling(baseAnalysis, alternatives, input);
  const callNote = await createQuickCallNote(supabase, {
    organizationId: input.organizationId,
    createdBy: input.userId,
    rawText: input.rawText,
  });
  const analyzedCallNote = await updateQuickCallNoteAnalysis(supabase, {
    organizationId: input.organizationId,
    callNoteId: callNote.id,
    analysis,
    status: "pending_approval",
  });
  const appointmentRequest = await createAppointmentRequestFromCallNote(supabase, {
    organizationId: input.organizationId,
    callNote: analyzedCallNote,
    analysis,
    alternatives,
  });
  const suggestedActionDrafts = buildQuickCallSuggestedActions(analyzedCallNote, analysis, alternatives);
  const suggestedActions = await createQuickCallSuggestedActions(
    supabase,
    suggestedActionDrafts.map((draft) => ({
      ...draft,
      organizationId: input.organizationId,
      callNoteId: analyzedCallNote.id,
      appointmentRequestId: appointmentRequest?.id ?? null,
    })),
  );

  return {
    callNote: analyzedCallNote,
    appointmentRequest,
    suggestedActions,
    warnings: buildWarnings(analysis),
    alternatives,
  };
}

type QuickCallAnalysisWithAlternatives = QuickCallAnalysis & {
  alternatives: AvailabilitySlot[];
};

async function getQuickCallAlternatives(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    rawText: string;
    timezone: string;
  },
  analysis: QuickCallAnalysis,
) {
  const [events, userRules] = await Promise.all([
    getCalendarEventsForAnalysis(supabase, input.organizationId, analysis),
    getActiveUserRules(supabase, input.organizationId),
  ]);

  return suggestQuickCallAlternativeSlots(events, userRules, analysis);
}

function finalizeQuickCallScheduling(
  analysis: QuickCallAnalysis,
  alternatives: AvailabilitySlot[],
  input: {
    rawText: string;
    timezone: string;
  },
): QuickCallAnalysisWithAlternatives {
  const finalized = finalizeSchedulingReplyForBrain(analysis, alternatives, {
    customerText: input.rawText,
    locale: input.timezone?.startsWith("Europe/Rome") ? "it-IT" : "en-US",
  });

  return {
    ...finalized,
    alternatives,
  };
}

async function analyzeQuickCallWithBrain(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    rawText: string;
    timezone: string;
  },
): Promise<QuickCallAnalysis> {
  const heuristic = analyzeQuickCallNote(input.rawText, { timezone: input.timezone });
  const brainContext = await getOrganizationBrainContext(supabase, input.organizationId);
  const analysis = await analyzeQuickCallWithAI(input.rawText, {
    timezone: input.timezone,
    fallbackAnalysis: heuristic,
    brainContext,
  });
  const enriched = enrichWithOrganizationBrain(brainContext, {
    text: input.rawText,
    reason: analysis.reason,
    suggestedReplyBody: analysis.suggestedReplyBody,
    extractedConstraints: analysis.extractedConstraints,
  });

  return {
    ...analysis,
    suggestedReplyBody: enriched.suggestedReplyBody,
    extractedConstraints: enriched.extractedConstraints,
    safetyNotes: [...(analysis.safetyNotes ?? []), ...enriched.brainNotes],
  };
}

async function getCalendarEventsForAnalysis(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
  analysis: QuickCallAnalysis,
) {
  const start = analysis.requestedStartsAt
    ? new Date(Math.min(new Date(analysis.requestedStartsAt).getTime(), Date.now()))
    : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  return getCachedCalendarEvents(supabase, organizationId, start.toISOString(), end.toISOString());
}

async function getActiveUserRules(supabase: SoreyaSupabaseClient, organizationId: string): Promise<UserRule[]> {
  const { data, error } = await supabase
    .from("user_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function buildWarnings(analysis: QuickCallAnalysis): string[] {
  const warnings: string[] = [];

  if (analysis.needsMoreInfo) {
    warnings.push(`Missing fields: ${analysis.missingFields.join(", ")}.`);
  }

  if (analysis.suggestedReplyChannel === "manual_review") {
    warnings.push("No reliable email or phone was detected; follow-up needs manual review.");
  }

  if (analysis.usedFallback) {
    warnings.push("AI fallback used; heuristic analysis prepared the draft.");
  }

  if (!["new_appointment", "reschedule_appointment", "cancel_appointment", "callback_request"].includes(analysis.intentType)) {
    warnings.push("The note was not classified as an operational scheduling request.");
  }

  return warnings;
}
