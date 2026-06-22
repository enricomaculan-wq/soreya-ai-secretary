type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export const reasoningModes = ["conservative", "balanced", "proactive"] as const;
export type ReasoningMode = (typeof reasoningModes)[number];

export const replyTones = ["professional", "friendly", "short", "apologetic"] as const;
export type ReplyTone = (typeof replyTones)[number];

export type OrganizationBrainSettings = {
  reasoningMode: ReasoningMode;
  defaultReplyTone: ReplyTone;
  requireServiceBeforeSlots: boolean;
  requireExplicitDate: boolean;
  ownerStyleNotes: string | null;
};

export const DEFAULT_ORGANIZATION_BRAIN_SETTINGS: OrganizationBrainSettings = {
  reasoningMode: "balanced",
  defaultReplyTone: "professional",
  requireServiceBeforeSlots: false,
  requireExplicitDate: true,
  ownerStyleNotes: null,
};

export type OrganizationService = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  currency: string;
  isActive: boolean;
  aliases: string[];
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MatchedOrganizationService = Pick<
  OrganizationService,
  "id" | "name" | "durationMinutes" | "priceCents" | "currency" | "slug"
> & {
  matchScore: number;
  matchedBy: "name" | "alias" | "slug";
};

export type OrganizationBrainContext = {
  settings: OrganizationBrainSettings;
  services: OrganizationService[];
};

export type OrganizationServiceInput = {
  slug: string;
  name: string;
  durationMinutes: number;
  priceCents?: number | null;
  currency?: string;
  isActive?: boolean;
  aliases?: string[];
  description?: string | null;
  sortOrder?: number;
};

export function parseOrganizationBrainSettings(value: Json | null | undefined): OrganizationBrainSettings {
  const settingsRecord = toRecord(value);
  const record = toRecord(settingsRecord.brain);

  return {
    reasoningMode: isReasoningMode(record.reasoningMode)
      ? record.reasoningMode
      : DEFAULT_ORGANIZATION_BRAIN_SETTINGS.reasoningMode,
    defaultReplyTone: isReplyTone(record.defaultReplyTone)
      ? record.defaultReplyTone
      : DEFAULT_ORGANIZATION_BRAIN_SETTINGS.defaultReplyTone,
    requireServiceBeforeSlots: readBoolean(record.requireServiceBeforeSlots, DEFAULT_ORGANIZATION_BRAIN_SETTINGS.requireServiceBeforeSlots),
    requireExplicitDate: readBoolean(record.requireExplicitDate, DEFAULT_ORGANIZATION_BRAIN_SETTINGS.requireExplicitDate),
    ownerStyleNotes: readString(record.ownerStyleNotes),
  };
}

export function serializeOrganizationBrainSettings(settings: OrganizationBrainSettings): Json {
  return {
    reasoningMode: settings.reasoningMode,
    defaultReplyTone: settings.defaultReplyTone,
    requireServiceBeforeSlots: settings.requireServiceBeforeSlots,
    requireExplicitDate: settings.requireExplicitDate,
    ownerStyleNotes: settings.ownerStyleNotes,
  };
}

export function mergeOrganizationSettingsBrain(
  currentSettings: Json,
  brainSettings: OrganizationBrainSettings,
): Json {
  const record = toRecord(currentSettings);

  return {
    ...record,
    brain: serializeOrganizationBrainSettings(brainSettings),
  };
}

export function formatServicePrice(service: Pick<OrganizationService, "priceCents" | "currency">, locale = "it-IT") {
  if (service.priceCents === null || service.priceCents === undefined) {
    return null;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: service.currency || "EUR",
  }).format(service.priceCents / 100);
}

export function formatItalianServiceForPerPhrase(name: string) {
  const phrases: Record<string, string> = {
    "igiene dentale": "l'igiene dentale",
    "visita di controllo": "la visita di controllo",
    "preventivo impianto": "il preventivo impianto",
    preventivo: "il preventivo",
    consulenza: "la consulenza",
    controllo: "il controllo",
    visita: "la visita",
    sopralluogo: "il sopralluogo",
    "appuntamento urgente": "l'appuntamento urgente",
    "urgenza per carie": "l'urgenza per una carie",
    "urgenza per dolore ai denti": "l'urgenza per dolore ai denti",
    "prima disponibilità utile": "la prima disponibilità utile",
  };

  return phrases[name.trim().toLowerCase()] ?? name;
}

export function formatItalianEuroPrice(service: Pick<OrganizationService, "priceCents" | "currency">) {
  if (service.priceCents === null || service.priceCents === undefined) {
    return null;
  }

  const amount = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(service.priceCents / 100);

  return `€ ${amount}`;
}

export function parseEuroPriceInputToCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    return Math.round(value * 100);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  const euros = Number(normalized);

  if (!Number.isFinite(euros) || euros < 0) {
    return null;
  }

  return Math.round(euros * 100);
}

export function readMatchedServiceFromConstraints(
  constraints: Json | undefined,
): MatchedOrganizationService | null {
  const services = readMatchedServicesFromConstraints(constraints);
  return services[0] ?? null;
}

export function readMatchedServicesFromConstraints(
  constraints: Json | undefined,
): MatchedOrganizationService[] {
  const record = toRecord(constraints);
  const matchedServices = record.matchedServices;

  if (Array.isArray(matchedServices)) {
    return matchedServices
      .map((item) => parseMatchedOrganizationService(item))
      .filter((item): item is MatchedOrganizationService => item !== null);
  }

  const matched = record.matchedService;
  const single = parseMatchedOrganizationService(matched);
  return single ? [single] : [];
}

export function resolveServiceDurationMinutes(
  matchedService: Pick<OrganizationService, "durationMinutes"> | null,
  fallbackMinutes = 30,
) {
  return matchedService?.durationMinutes ?? fallbackMinutes;
}

export function resolveCombinedServiceDurationMinutes(
  services: Array<Pick<OrganizationService, "durationMinutes">>,
  fallbackMinutes = 30,
) {
  if (services.length === 0) {
    return fallbackMinutes;
  }

  return services.reduce((total, service) => total + service.durationMinutes, 0);
}

export function readRequiredDurationMinutesFromConstraints(
  constraints: Json | undefined,
  fallbackMinutes = 30,
) {
  const record = toRecord(constraints);

  if (typeof record.requiredDurationMinutes === "number" && record.requiredDurationMinutes > 0) {
    return record.requiredDurationMinutes;
  }

  const services = readMatchedServicesFromConstraints(constraints);
  return resolveCombinedServiceDurationMinutes(services, fallbackMinutes);
}

function parseMatchedOrganizationService(value: unknown): MatchedOrganizationService | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, Json | undefined>;

  if (
    typeof row.id !== "string"
    || typeof row.name !== "string"
    || typeof row.slug !== "string"
    || typeof row.durationMinutes !== "number"
    || typeof row.matchScore !== "number"
    || typeof row.matchedBy !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    durationMinutes: row.durationMinutes,
    priceCents: typeof row.priceCents === "number" ? row.priceCents : null,
    currency: typeof row.currency === "string" ? row.currency : "EUR",
    matchScore: row.matchScore,
    matchedBy: row.matchedBy as MatchedOrganizationService["matchedBy"],
  };
}

export function formatServiceDuration(minutes: number, locale = "it-IT") {
  if (minutes < 60) {
    return locale.startsWith("it") ? `${minutes} min` : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) {
    return locale.startsWith("it") ? `${hours} h` : `${hours} hr`;
  }

  return locale.startsWith("it")
    ? `${hours} h ${remainder} min`
    : `${hours} hr ${remainder} min`;
}

function toRecord(value: unknown): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Json | undefined>) : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function isReasoningMode(value: unknown): value is ReasoningMode {
  return typeof value === "string" && (reasoningModes as readonly string[]).includes(value);
}

function isReplyTone(value: unknown): value is ReplyTone {
  return typeof value === "string" && (replyTones as readonly string[]).includes(value);
}
