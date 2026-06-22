import {
  buildBrainSystemPromptAddendum,
  enrichWithOrganizationBrain,
  finalizeDemoSchedulingReplyForBrain,
  polishDemoSuggestedReply,
} from "@soreya/ai";
import { getOrganizationBrainContext } from "@soreya/database";
import {
  getDemoBrainContext,
  readRequiredDurationMinutesFromConstraints,
  resolveDemoPatientFirstName,
  type AvailabilitySlot,
  type DemoDetectedIntent,
  type Json,
  type OrganizationBrainContext,
  type SupportedLocale,
} from "@soreya/shared";

import { getAuthenticatedServerContext } from "@/lib/server/supabase";

type DemoBrainEnrichmentInput = {
  locale: SupportedLocale;
  customerText: string;
  customerName?: string | null;
  reason: string | null;
  suggestedReply: string;
  safetyNotes: string[];
  detectedIntent: DemoDetectedIntent;
  isThirdPartyRequest: boolean;
  hasMultipleRequests: boolean;
  requiresOperatorAttention?: boolean;
  alternatives?: AvailabilitySlot[];
  senderName?: string | null;
};

export async function resolveDemoBrainContext(
  locale: SupportedLocale,
  overrides?: { services?: OrganizationBrainContext["services"] },
): Promise<OrganizationBrainContext> {
  try {
    const context = await getAuthenticatedServerContext();
    const brainContext = await getOrganizationBrainContext(
      context.supabase,
      context.userOrganization.organization.id,
    );

    if (overrides?.services?.length) {
      return { ...brainContext, services: overrides.services };
    }

    return brainContext;
  } catch {
    const base = getDemoBrainContext(locale);

    if (overrides?.services?.length) {
      return { ...base, services: overrides.services };
    }

    return base;
  }
}

export function buildDemoBrainSystemPrompt(context: OrganizationBrainContext) {
  return `${buildBrainSystemPromptAddendum(context)}`;
}

export function enrichDemoAnalyzeResultWithContext<T extends DemoBrainEnrichmentInput>(
  response: T,
  brainContext: OrganizationBrainContext,
): T {
  if (shouldSkipDemoBrainEnrichment(response)) {
    return response;
  }

  const enriched = enrichWithOrganizationBrain(brainContext, {
    text: response.customerText,
    reason: response.reason,
    suggestedReplyBody: response.suggestedReply,
    locale: response.locale === "it" ? "it-IT" : "en-US",
    alwaysIncludeServiceDetails: true,
  });

  const previousAlternativeCount = response.alternatives?.length ?? 0;
  const alternatives = response.alternatives
    ? ensureDemoAlternativesMeetDuration(response.alternatives, enriched.extractedConstraints)
    : response.alternatives;
  const finalizedReply = finalizeDemoSchedulingReplyForBrain(
    enriched.suggestedReplyBody ?? response.suggestedReply,
    alternatives ?? [],
    enriched,
    {
      locale: response.locale === "it" ? "it-IT" : "en-US",
      customerText: response.customerText,
      previousAlternativeCount,
    },
  );
  const suggestedReply = polishDemoSuggestedReply({
    locale: response.locale === "it" ? "it-IT" : "en-US",
    senderName: resolveDemoPatientFirstName(response.senderName, response.customerName),
    customerText: response.customerText,
    suggestedReply: finalizedReply,
    matchedServices: enriched.matchedServices,
    requiredDurationMinutes: enriched.requiredDurationMinutes,
    alternatives: alternatives ?? [],
  });

  return {
    ...response,
    suggestedReply,
    reason: response.reason ?? (
      enriched.matchedServices.length > 1
        ? enriched.matchedServices.map((service) => service.name).join(" + ")
        : enriched.matchedService?.name ?? null
    ),
    alternatives,
    safetyNotes: [...response.safetyNotes, ...enriched.brainNotes],
  };
}

function ensureDemoAlternativesMeetDuration(
  slots: AvailabilitySlot[],
  extractedConstraints: Record<string, Json | undefined>,
) {
  const requiredDurationMinutes = readRequiredDurationMinutesFromConstraints(extractedConstraints as Json);
  if (requiredDurationMinutes <= 0) {
    return slots;
  }

  return slots.map((slot) => {
    if (slot.durationMinutes >= requiredDurationMinutes) {
      return slot;
    }

    const startsAtMs = new Date(slot.startsAt).getTime();

    return {
      ...slot,
      endsAt: new Date(startsAtMs + requiredDurationMinutes * 60_000).toISOString(),
      durationMinutes: requiredDurationMinutes,
    };
  });
}

function shouldSkipDemoBrainEnrichment(response: DemoBrainEnrichmentInput) {
  return response.isThirdPartyRequest
    || response.hasMultipleRequests
    || response.requiresOperatorAttention
    || response.detectedIntent === "cancel_appointment"
    || response.detectedIntent === "reschedule_appointment"
    || response.detectedIntent === "delay_notice"
    || response.detectedIntent === "appointment_confirmation";
}
