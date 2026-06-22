import {
  analyzeDemoCustomerRequest,
  buildDemoApprovalFromRequest,
  getDemoBrainContext,
  type OrganizationService,
  type SupportedLocale,
  type SuggestedAction,
} from "@soreya/shared";

export const PRESENTATION_EXAMPLE_KEYS = [
  "hygieneVisitTomorrow",
  "hygienePrice",
  "rescheduleThursday",
] as const;

export type PresentationExampleKey = (typeof PRESENTATION_EXAMPLE_KEYS)[number];

export function getPresentationExampleKeyOrder() {
  return PRESENTATION_EXAMPLE_KEYS;
}

export function buildPresentationPlaygroundSeed(
  locale: SupportedLocale,
  customerText: string,
  senderText: string,
) {
  return {
    channel: "whatsapp" as const,
    senderText,
    customerText,
  };
}

export function matchDemoServicesFromText(
  customerText: string,
  reason: string | null | undefined,
  locale: SupportedLocale,
  servicesOverride?: OrganizationService[],
): OrganizationService[] {
  const context = servicesOverride?.length
    ? { services: servicesOverride }
    : getDemoBrainContext(locale);
  const haystack = normalizeMatchText(`${customerText} ${reason ?? ""}`);
  const matched = new Map<string, OrganizationService>();

  for (const service of context.services) {
    if (!service.isActive) {
      continue;
    }

    const candidates = [
      service.name,
      ...service.aliases,
      service.slug.replace(/_/g, " "),
    ].sort((left, right) => normalizeMatchText(right).length - normalizeMatchText(left).length);

    for (const candidate of candidates) {
      const needle = normalizeMatchText(candidate);

      if (needle.length >= 3 && haystack.includes(needle)) {
        matched.set(service.id, service);
        break;
      }
    }
  }

  return [...matched.values()];
}

export function buildPresentationPendingAction(
  locale: SupportedLocale,
  customerText: string,
): SuggestedAction {
  const analysis = analyzeDemoCustomerRequest({
    channel: "whatsapp",
    customerText,
    locale,
  });
  const action = buildDemoApprovalFromRequest(analysis);
  const now = new Date().toISOString();

  return {
    ...action,
    status: "pending_approval",
    approved_by: null,
    approved_at: null,
    updated_at: now,
  };
}

export function isDemoPlaygroundAction(action: SuggestedAction) {
  const payload = action.draft_payload;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  return payload.demoPlayground === true;
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
