import {
  analyzeQuickCallNote,
  analyzeQuickCallWithAI,
  buildQuickCallSuggestedActions,
  suggestQuickCallAlternativeSlots,
} from "@soreya/ai";
import {
  createAppointmentRequestFromCallNote,
  createQuickCallNote,
  createQuickCallSuggestedActions,
  getCachedCalendarEvents,
  updateQuickCallNoteAnalysis,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type {
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
  const heuristic = analyzeQuickCallNote(input.rawText, { timezone: input.timezone });
  const analysis = await analyzeQuickCallWithAI(input.rawText, {
    timezone: input.timezone,
    fallbackAnalysis: heuristic,
  });
  const [events, userRules] = await Promise.all([
    getCalendarEventsForAnalysis(supabase, input.organizationId, analysis),
    getActiveUserRules(supabase, input.organizationId),
  ]);
  const alternatives = suggestQuickCallAlternativeSlots(events, userRules, analysis);
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
  const heuristic = analyzeQuickCallNote(input.rawText, { timezone: input.timezone });
  const analysis = await analyzeQuickCallWithAI(input.rawText, {
    timezone: input.timezone,
    fallbackAnalysis: heuristic,
  });
  const [events, userRules] = await Promise.all([
    getCalendarEventsForAnalysis(supabase, input.organizationId, analysis),
    getActiveUserRules(supabase, input.organizationId),
  ]);
  const alternatives = suggestQuickCallAlternativeSlots(events, userRules, analysis);
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
