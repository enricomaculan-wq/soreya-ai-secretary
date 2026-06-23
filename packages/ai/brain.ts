import type {
  AvailabilitySlot,
  Json,
  MatchedOrganizationService,
  OrganizationBrainContext,
  OrganizationBrainSettings,
  OrganizationService,
  ReasoningMode,
} from "@soreya/shared";
import {
  DEFAULT_ORGANIZATION_BRAIN_SETTINGS,
  alignDemoReplyWithCustomerGreeting,
  detectDemoCustomerGreeting,
  formatDemoStudioGreeting,
  formatItalianEuroPrice,
  formatItalianServiceForPerPhrase,
  formatServiceDuration,
  formatServicePrice,
  readMatchedServicesFromConstraints,
  readRequiredDurationMinutesFromConstraints,
  resolveCombinedServiceDurationMinutes,
  resolveDemoPatientFirstName,
} from "@soreya/shared";

import type { CalendarEngineRules } from "./calendar";
import { filterAvailabilitySlotsByRequiredDuration } from "./calendar";

export type BrainEnrichmentInput = {
  text: string;
  reason?: string | null;
  suggestedReplyBody?: string | null;
  extractedConstraints?: Json;
  locale?: string;
  alwaysIncludeServiceDetails?: boolean;
};

export type BrainEnrichmentResult = {
  matchedService: MatchedOrganizationService | null;
  matchedServices: MatchedOrganizationService[];
  requiredDurationMinutes: number;
  suggestedReplyBody: string | null;
  extractedConstraints: Record<string, Json | undefined>;
  reasoningMode: ReasoningMode;
  brainNotes: string[];
};

export function buildBrainSystemPromptAddendum(context: OrganizationBrainContext): string {
  const { settings, services } = context;
  const serviceLines = services
    .filter((service) => service.isActive)
    .map((service) => {
      const price = formatServicePrice(service, "it-IT") ?? "prezzo su richiesta";
      const duration = formatServiceDuration(service.durationMinutes, "it-IT");
      const aliases = service.aliases.length > 0 ? ` alias: ${service.aliases.join(", ")}` : "";

      return `- ${service.name} (${service.slug}): ${duration}, ${price}${aliases}`;
    })
    .join("\n");

  const modeInstructions: Record<ReasoningMode, string> = {
    conservative:
      "Modalita conservative: chiedi chiarimenti prima di proporre slot o prezzi. Cita costo e durata solo se il cliente li chiede esplicitamente o se il servizio e certo.",
    balanced:
      "Modalita balanced: quando il servizio e riconosciuto, indica durata e costo in modo naturale insieme alle prossime opzioni di appuntamento.",
    proactive:
      "Modalita proactive: proponi subito servizio, durata stimata, costo e prossimi passi come farebbe il titolare attento ma efficiente.",
  };

  return [
    "Contesto Brain Soreya:",
    modeInstructions[settings.reasoningMode],
    `Tono predefinito risposte: ${settings.defaultReplyTone}.`,
    settings.requireExplicitDate
      ? "Non inventare date/orari: se mancano, chiedili esplicitamente."
      : "Puoi proporre alternative generiche se la data non e precisa.",
    settings.requireServiceBeforeSlots
      ? "Prima di proporre slot calendario, identifica il servizio richiesto."
      : "Puoi proporre slot anche se il servizio non e ancora certo.",
    "Se il cliente chiede uno o piu servizi: indica prezzo e durata di ciascun servizio, somma le durate se sono piu di uno, e proponi solo slot con finestra libera almeno pari al tempo necessario (es. servizio da 1 h 30 -> non proporre disponibilita da 1 h). Se la data richiesta non ha abbastanza tempo libero, dillo chiaramente e non suggerire orari troppo corti.",
    settings.ownerStyleNotes ? `Note stile titolare: ${settings.ownerStyleNotes}` : null,
    services.length > 0 ? `Listino servizi attivo:\n${serviceLines}` : "Listino servizi non configurato: non inventare prezzi.",
    "Non promettere mai azioni gia eseguite. Le risposte restano bozze da approvare.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function matchOrganizationService(
  text: string,
  services: OrganizationService[],
): MatchedOrganizationService | null {
  return matchOrganizationServices(text, services)[0] ?? null;
}

export function matchOrganizationServices(
  text: string,
  services: OrganizationService[],
): MatchedOrganizationService[] {
  const normalized = normalizeMatchText(text);

  if (!normalized) {
    return [];
  }

  const matches: MatchedOrganizationService[] = [];

  for (const service of services) {
    if (!service.isActive) {
      continue;
    }

    let bestMatchForService: MatchedOrganizationService | null = null;
    const candidates = [
      { value: service.name, matchedBy: "name" as const, score: 0.95 },
      { value: service.slug.replace(/_/g, " "), matchedBy: "slug" as const, score: 0.8 },
      ...service.aliases.map((alias) => ({ value: alias, matchedBy: "alias" as const, score: 0.9 })),
    ].sort((left, right) => normalizeMatchText(right.value).length - normalizeMatchText(left.value).length);

    for (const candidate of candidates) {
      const needle = normalizeMatchText(candidate.value);

      if (!needle || needle.length < 3) {
        continue;
      }

      if (normalized.includes(needle)) {
        bestMatchForService = {
          id: service.id,
          slug: service.slug,
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceCents: service.priceCents,
          currency: service.currency,
          matchScore: candidate.score,
          matchedBy: candidate.matchedBy,
        };
        break;
      }
    }

    if (bestMatchForService) {
      matches.push(bestMatchForService);
    }
  }

  return matches.sort((left, right) => left.name.localeCompare(right.name, "it"));
}

export function enrichWithOrganizationBrain(
  context: OrganizationBrainContext,
  input: BrainEnrichmentInput,
): BrainEnrichmentResult {
  const settings = context.settings ?? DEFAULT_ORGANIZATION_BRAIN_SETTINGS;
  const combinedText = [input.text, input.reason].filter(Boolean).join(" ");
  const matchedServices = matchOrganizationServices(combinedText, context.services);
  const matchedService = matchedServices[0] ?? null;
  const requiredDurationMinutes = resolveCombinedServiceDurationMinutes(matchedServices);
  const extractedConstraints = toRecord(input.extractedConstraints);
  const brainNotes: string[] = [];
  let suggestedReplyBody = input.suggestedReplyBody ?? null;
  const locale = input.locale ?? "it-IT";
  const isItalian = locale.startsWith("it");

  if (matchedServices.length > 0) {
    extractedConstraints.matchedServices = matchedServices as unknown as Json;
    extractedConstraints.matchedService = (matchedService ?? matchedServices[0]) as unknown as Json;
    extractedConstraints.requiredDurationMinutes = requiredDurationMinutes;
    brainNotes.push(
      matchedServices.length > 1
        ? `Servizi riconosciuti: ${matchedServices.map((service) => service.name).join(", ")}. Durata totale ${requiredDurationMinutes} min.`
        : `Servizio riconosciuto: ${matchedService?.name}.`,
    );

    const shouldMentionPricing =
      input.alwaysIncludeServiceDetails
      || settings.reasoningMode === "proactive"
      || (settings.reasoningMode === "balanced" && matchedServices.every((service) => service.matchScore >= 0.85))
      || asksAboutPriceOrDuration(combinedText);

    if (shouldMentionPricing) {
      const pricingBlock = buildServicePricingBlock(matchedServices, requiredDurationMinutes, locale, isItalian);

      if (!suggestedReplyBody || !containsFullServicePricingHint(suggestedReplyBody, matchedServices, requiredDurationMinutes)) {
        suggestedReplyBody = suggestedReplyBody
          ? `${suggestedReplyBody}\n\n${pricingBlock}`
          : pricingBlock;
      } else if (!containsCombinedDurationHint(suggestedReplyBody, requiredDurationMinutes)) {
        suggestedReplyBody = `${suggestedReplyBody}\n\n${buildCombinedDurationLine(requiredDurationMinutes, locale, isItalian)}`;
      }

      brainNotes.push(
        matchedServices.length > 1
          ? "Prezzi singoli e durata totale aggiunti alla bozza."
          : "Costo e durata aggiunti alla bozza in base al listino.",
      );
    } else {
      brainNotes.push("Servizi riconosciuti ma prezzo/durata non inseriti (modalita conservative o richiesta incompleta).");
    }
  } else if (settings.requireServiceBeforeSlots) {
    brainNotes.push("Servizio non riconosciuto dal listino: chiedere chiarimenti prima degli slot.");
    if (!suggestedReplyBody) {
      suggestedReplyBody = isItalian
        ? "Per aiutarla al meglio, potrebbe indicarmi quale servizio desidera? Cosi posso indicarle tempi e costo previsti."
        : "To help you best, could you tell me which service you need? I can then share the expected time and cost.";
    }
  }

  extractedConstraints.brain = {
    reasoningMode: settings.reasoningMode,
    defaultReplyTone: settings.defaultReplyTone,
    matchedServiceId: matchedService?.id ?? null,
    matchedServiceIds: matchedServices.map((service) => service.id),
    requiredDurationMinutes,
    brainNotes,
  } as unknown as Json;

  return {
    matchedService,
    matchedServices,
    requiredDurationMinutes,
    suggestedReplyBody,
    extractedConstraints,
    reasoningMode: settings.reasoningMode,
    brainNotes,
  };
}

export function resolveBrainCalendarRules(extractedConstraints?: Json): CalendarEngineRules {
  return {
    durationMinutes: readRequiredDurationMinutesFromConstraints(extractedConstraints),
  };
}

export function resolveRequestedAppointmentWindow(
  requestedStartsAt: string | null | undefined,
  requestedEndsAt: string | null | undefined,
  extractedConstraints?: Json,
) {
  const requiredDurationMinutes = readRequiredDurationMinutesFromConstraints(extractedConstraints);

  if (!requestedStartsAt) {
    return {
      startsAt: null,
      endsAt: null,
      requiredDurationMinutes,
    };
  }

  const startMs = new Date(requestedStartsAt).getTime();
  const requestedEndMs = requestedEndsAt ? new Date(requestedEndsAt).getTime() : startMs + requiredDurationMinutes * 60_000;
  const actualDurationMinutes = Math.max(0, Math.round((requestedEndMs - startMs) / 60_000));
  const endsAt = actualDurationMinutes >= requiredDurationMinutes
    ? new Date(requestedEndMs).toISOString()
    : new Date(startMs + requiredDurationMinutes * 60_000).toISOString();

  return {
    startsAt: requestedStartsAt,
    endsAt,
    requiredDurationMinutes,
  };
}

export function filterAlternativesForBrainConstraints(
  slots: AvailabilitySlot[],
  extractedConstraints?: Json,
): AvailabilitySlot[] {
  return filterAvailabilitySlotsByRequiredDuration(
    slots,
    readRequiredDurationMinutesFromConstraints(extractedConstraints),
  );
}

export function finalizeSchedulingReplyForBrain<T extends {
  suggestedReplyBody?: string | null;
  extractedConstraints?: Json;
  safetyNotes?: string[];
}>(
  analysis: T,
  alternatives: AvailabilitySlot[],
  options?: {
    locale?: string;
    customerText?: string;
    previousAlternativeCount?: number;
  },
): T {
  const matchedServices = readMatchedServicesFromConstraints(analysis.extractedConstraints);
  const requiredDurationMinutes = readRequiredDurationMinutesFromConstraints(analysis.extractedConstraints);

  if (matchedServices.length === 0 || requiredDurationMinutes <= 30) {
    return analysis;
  }

  const previousCount = options?.previousAlternativeCount;
  const removedShortSlots = previousCount !== undefined
    ? previousCount > alternatives.length
    : false;
  const shouldExplainShortfall = alternatives.length === 0
    && (removedShortSlots || mentionsSchedulingIntent(options?.customerText ?? ""));

  if (!shouldExplainShortfall) {
    return analysis;
  }

  const locale = options?.locale ?? "it-IT";
  const notice = buildInsufficientDurationNotice(requiredDurationMinutes, locale);
  const brainNote = matchedServices.length > 1
    ? `Nessuno slot >= ${requiredDurationMinutes} min per i servizi combinati: non proporre finestre troppo corte.`
    : `Nessuno slot >= ${requiredDurationMinutes} min per ${matchedServices[0]?.name}: non proporre finestre troppo corte.`;

  const sanitizedReply = sanitizeReplyWhenSlotsInsufficient(analysis.suggestedReplyBody ?? null);

  return {
    ...analysis,
    suggestedReplyBody: mergeReplyWithSchedulingNotice(sanitizedReply, notice),
    safetyNotes: [...(analysis.safetyNotes ?? []), brainNote],
  };
}

export function finalizeDemoSchedulingReplyForBrain(
  suggestedReply: string,
  alternatives: AvailabilitySlot[],
  enriched: Pick<BrainEnrichmentResult, "extractedConstraints" | "requiredDurationMinutes" | "matchedServices">,
  options?: {
    locale?: string;
    customerText?: string;
    previousAlternativeCount?: number;
  },
) {
  const finalized = finalizeSchedulingReplyForBrain(
    {
      suggestedReplyBody: suggestedReply,
      extractedConstraints: enriched.extractedConstraints as Json,
      safetyNotes: [],
    },
    alternatives,
    options,
  );

  return finalized.suggestedReplyBody ?? suggestedReply;
}

export function polishDemoSuggestedReply(input: {
  locale: string;
  senderName?: string | null;
  customerText?: string;
  suggestedReply: string;
  matchedServices: MatchedOrganizationService[];
  requiredDurationMinutes: number;
  alternatives: AvailabilitySlot[];
}): string {
  const isItalian = input.locale.startsWith("it");
  const firstName = resolveDemoPatientFirstName(input.senderName);
  let reply = scrubGenericPatientGreeting(input.suggestedReply.trim(), firstName, isItalian);

  if (!reply) {
    return reply;
  }

  const customerTone = input.customerText ? detectDemoCustomerGreeting(input.customerText) : null;
  const greetingPattern = isItalian
    ? /^(buongiorno|buonasera|ciao|certo|grazie|perfetto)\b/i
    : /^(good morning|good afternoon|hi|hello|sure|thanks|perfect)\b/i;

  if (customerTone) {
    const greeting = formatDemoStudioGreeting(customerTone, firstName, input.locale);
    if (firstName) {
      reply = reply.replace(
        /^(?:Certo|Buongiorno|Buonasera|Ciao|Sure|Good morning|Good afternoon|Hi|Hello)\s+([^,\n]+),/i,
        greeting,
      );
    } else {
      reply = reply.replace(/^(?:Certo|Buongiorno|Buonasera|Ciao|Sure|Good morning|Good afternoon|Hi|Hello),/i, greeting);
    }
  } else if (firstName && !greetingPattern.test(reply)) {
    reply = isItalian
      ? `Buongiorno ${firstName},\n\n${reply}`
      : `Good morning ${firstName},\n\n${reply}`;
  } else if (!greetingPattern.test(reply)) {
    reply = isItalian ? `Buongiorno,\n\n${reply}` : `Good morning,\n\n${reply}`;
  }

  if (input.customerText) {
    reply = alignDemoReplyWithCustomerGreeting(reply, input.customerText, firstName, input.locale);
  }

  if (replyConfirmsAppointment(reply)) {
    return stripPatientFacingDraftMeta(reply).replace(/\n{3,}/g, "\n\n").trim();
  }

  if (
    input.alternatives.length > 0
    && replyAsksForDayOrTimePreference(reply)
  ) {
    const slots = formatAlternativeSlotsForReply(input.alternatives, input.locale);
    reply = isItalian
      ? `Ho controllato l'agenda: le posso proporre ${slots}. Quale orario preferisce?`
      : `I checked the calendar: I can offer ${slots}. Which one works best for you?`;
  } else if (
    input.alternatives.length > 0
    && !replyMentionsAlternativeSlots(reply, input.alternatives, input.locale)
    && !replyAlreadyProposesSlots(reply)
  ) {
    const slots = formatAlternativeSlotsForReply(input.alternatives, input.locale);
    const slotLine = isItalian
      ? `Ho controllato l'agenda: per l'intervallo richiesto le posso proporre ${slots}. Mi indichi quale preferisce?`
      : `I checked the calendar: for the requested window I can offer ${slots}. Which one works best for you?`;

    reply = `${reply}\n\n${slotLine}`;
  }

  return stripPatientFacingDraftMeta(reply).replace(/\n{3,}/g, "\n\n").trim();
}

export function brainContextToJson(context: OrganizationBrainContext) {
  return {
    brain: {
      settings: context.settings,
      services: context.services,
    },
  } as const;
}

export function applyBrainEnrichmentToAnalysis<T extends {
  reason?: string | null;
  suggestedReplyBody?: string | null;
  extractedConstraints?: Json;
  safetyNotes?: string[];
}>(
  context: OrganizationBrainContext,
  analysis: T,
  text: string,
  locale?: string,
): T {
  const enriched = enrichWithOrganizationBrain(context, {
    text,
    reason: analysis.reason,
    suggestedReplyBody: analysis.suggestedReplyBody,
    extractedConstraints: analysis.extractedConstraints,
    locale,
  });

  return {
    ...analysis,
    suggestedReplyBody: enriched.suggestedReplyBody,
    extractedConstraints: enriched.extractedConstraints as Json,
    safetyNotes: [...(analysis.safetyNotes ?? []), ...enriched.brainNotes],
  };
}

function buildServicePricingBlock(
  services: MatchedOrganizationService[],
  requiredDurationMinutes: number,
  locale: string,
  isItalian: boolean,
) {
  if (services.length === 1) {
    const service = services[0];
    const durationText = formatServiceDuration(service.durationMinutes, locale);

    if (isItalian) {
      const servicePhrase = formatItalianServiceForPerPhrase(service.name);
      const priceText = formatItalianEuroPrice(service);

      if (priceText) {
        return `Per ${servicePhrase} la durata prevista è di circa ${durationText} e il costo è di ${priceText}.`;
      }

      return `Per ${servicePhrase} la durata prevista è di circa ${durationText}; il costo è da definire su preventivo.`;
    }

    const priceText = formatServicePrice(service, locale) ?? "price to confirm";
    return `For ${service.name}, the expected duration is about ${durationText} and the cost is ${priceText}.`;
  }

  const header = isItalian ? "Per i servizi richiesti:" : "For the requested services:";
  const lines = services.map((service) => {
    const priceText = formatServicePrice(service, locale) ?? (isItalian ? "preventivo su richiesta" : "quote on request");
    const durationText = formatServiceDuration(service.durationMinutes, locale);
    return `- ${service.name}: ${durationText}, ${priceText}`;
  });

  return [header, ...lines, buildCombinedDurationLine(requiredDurationMinutes, locale, isItalian)].join("\n");
}

function buildInsufficientDurationNotice(requiredDurationMinutes: number, locale: string) {
  const isItalian = locale.startsWith("it");
  const durationText = formatServiceDuration(requiredDurationMinutes, locale);

  return isItalian
    ? `Per il tempo necessario in studio (circa ${durationText}) la disponibilita indicata non basta, quindi non le propongo quell'orario. Posso cercare un giorno con almeno ${durationText} liberi consecutivi.`
    : `The indicated availability is not long enough for the required studio time (about ${durationText}), so I am not suggesting that slot. I can look for a day with at least ${durationText} free in a row.`;
}

function sanitizeReplyWhenSlotsInsufficient(reply: string | null) {
  if (!reply) {
    return null;
  }

  const slotProposalPattern = /\b(disponibil|9:30|11:00|16:30|17:15|preferisci|available at|which time)\b/i;

  return reply
    .split("\n")
    .filter((line) => !slotProposalPattern.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mergeReplyWithSchedulingNotice(currentReply: string | null, notice: string) {
  if (!currentReply) {
    return notice;
  }

  if (normalizeMatchText(currentReply).includes(normalizeMatchText(notice.slice(0, 24)))) {
    return currentReply;
  }

  return `${currentReply}\n\n${notice}`;
}

function mentionsSchedulingIntent(text: string) {
  const normalized = normalizeMatchText(text);
  const hints = [
    "domani",
    "dopodomani",
    "oggi",
    "disponibil",
    "posto",
    "slot",
    "orario",
    "appuntamento",
    "tomorrow",
    "today",
    "availability",
    "available",
    "appointment",
  ];

  return hints.some((hint) => normalized.includes(normalizeMatchText(hint)));
}

function stripPatientFacingDraftMeta(reply: string) {
  const metaPattern =
    /(bozza da approvare|resta una bozza|stays as a draft|pending approval before sending|awaiting approval|da approvare prima|prima dell['’]invio|nessuna modifica viene fatta senza conferma|nothing will be changed without confirmation|preparo la cancellazione|i['’]ll prepare the cancellation)/i;

  return reply
    .split(/\n+/)
    .map((paragraph) =>
      paragraph
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !metaPattern.test(sentence))
        .join(" ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function scrubGenericPatientGreeting(reply: string, firstName: string | null, isItalian: boolean) {
  const genericGreeting = isItalian
    ? /^(buongiorno|buonasera|ciao)\s+cliente\b[,\s]*/i
    : /^(good morning|good afternoon|hi|hello)\s+customer\b[,\s]*/i;

  if (!genericGreeting.test(reply)) {
    return reply;
  }

  if (firstName) {
    return reply.replace(
      genericGreeting,
      isItalian ? `Buongiorno ${firstName},\n\n` : `Good morning ${firstName},\n\n`,
    );
  }

  return reply.replace(genericGreeting, isItalian ? "Buongiorno,\n\n" : "Good morning,\n\n");
}

function formatAlternativeSlotsForReply(alternatives: AvailabilitySlot[], locale: string) {
  const localeTag = locale.startsWith("it") ? "it-IT" : "en-US";

  return alternatives
    .slice(0, 3)
    .map((slot) =>
      new Intl.DateTimeFormat(localeTag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Rome",
      }).format(new Date(slot.startsAt)),
    )
    .join(isItalianLocale(locale) ? " oppure " : " or ");
}

function isItalianLocale(locale: string) {
  return locale.startsWith("it");
}

function replyConfirmsAppointment(reply: string) {
  const normalized = normalizeMatchText(reply);
  return [
    "confermo per",
    "i confirm",
    "see you then",
    "a presto",
    "perfetto",
    "perfect",
  ].some((hint) => normalized.includes(hint));
}

function replyAlreadyProposesSlots(reply: string) {
  const normalized = normalizeMatchText(reply);
  return [
    "prima disponibilit",
    "first available",
    "quale orario prefer",
    "which time works",
    "quale preferisce",
    "quale preferisci",
    "which one works",
    "ho controllato l agenda",
    "i checked the calendar",
  ].some((hint) => normalized.includes(hint));
}

function replyAsksForDayOrTimePreference(reply: string) {
  const normalized = normalizeMatchText(reply);
  return [
    "giorno o fascia oraria",
    "day or time window",
    "mi indichi quale giorno",
    "could you tell me which day",
    "fascia oraria preferisci",
    "time window you prefer",
  ].some((hint) => normalized.includes(hint));
}

function replyMentionsAlternativeSlots(reply: string, alternatives: AvailabilitySlot[], locale = "it-IT") {
  const normalizedReply = normalizeMatchText(reply);

  return alternatives.every((slot) => {
    const time = new Intl.DateTimeFormat(locale.startsWith("it") ? "it-IT" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    })
      .format(new Date(slot.startsAt))
      .replace(/^0/, "")
      .toLowerCase();

    return normalizedReply.includes(time) || normalizedReply.includes(time.replace(":", "."));
  });
}

function buildCombinedDurationLine(requiredDurationMinutes: number, locale: string, isItalian: boolean) {
  const totalDuration = formatServiceDuration(requiredDurationMinutes, locale);
  return isItalian
    ? `Tempo totale previsto in studio: circa ${totalDuration}.`
    : `Total estimated time in studio: about ${totalDuration}.`;
}

function asksAboutPriceOrDuration(text: string) {
  const normalized = normalizeMatchText(text);
  const hints = [
    "quanto costa",
    "costo",
    "prezzo",
    "preventivo",
    "tariffa",
    "quanto tempo",
    "durata",
    "quanto dura",
    "how much",
    "price",
    "cost",
    "how long",
    "both",
    "entrambi",
    "anche",
  ];

  return hints.some((hint) => normalized.includes(normalizeMatchText(hint)));
}

function containsServicePricingHint(text: string, services: MatchedOrganizationService[]) {
  const normalized = normalizeMatchText(text);
  return services.some((service) => normalized.includes(normalizeMatchText(service.name)));
}

function containsFullServicePricingHint(
  text: string,
  services: MatchedOrganizationService[],
  requiredDurationMinutes: number,
) {
  if (services.length === 1) {
    return replyIncludesCatalogDetailsForService(text, services[0]);
  }

  return services.every((service) => replyIncludesCatalogDetailsForService(text, service))
    && containsCombinedDurationHint(text, requiredDurationMinutes);
}

function replyIncludesCatalogDetailsForService(text: string, service: MatchedOrganizationService) {
  const normalized = normalizeMatchText(text);
  const hasName = normalized.includes(normalizeMatchText(service.name));
  const hasDuration =
    normalized.includes(String(service.durationMinutes))
    && (normalized.includes("durata") || normalized.includes("min") || normalized.includes("circa"));
  const hasPrice =
    service.priceCents === null
      ? normalized.includes("preventivo") || normalized.includes("quote")
      : normalized.includes("costo e di")
        || normalized.includes(String(service.priceCents / 100))
        || normalized.includes("indicative cost");

  return hasName && hasDuration && hasPrice;
}

function containsCombinedDurationHint(text: string, requiredDurationMinutes: number) {
  const normalized = normalizeMatchText(text);
  return ["totale", "total", "insieme", "combined"].some((hint) => normalized.includes(hint))
    || normalized.includes(String(requiredDurationMinutes));
}

function normalizeMatchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
