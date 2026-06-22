import { createOrganizationService, getOrganizationServices } from "@soreya/database";
import type { OrganizationServiceInput } from "@soreya/shared";
import { parseEuroPriceInputToCents } from "@soreya/shared";

import { assertOrganizationAdmin } from "@/lib/server/brain-api";
import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET() {
  try {
    const context = await getAuthenticatedServerContext();
    const services = await getOrganizationServices(
      context.supabase,
      context.userOrganization.organization.id,
    );

    return Response.json({ services });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    assertOrganizationAdmin(context.userOrganization.membership.role);
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseServiceInput(body);
    const service = await createOrganizationService(
      context.supabase,
      context.userOrganization.organization.id,
      input,
    );

    return Response.json({ service });
  } catch (error) {
    return jsonError(error);
  }
}

function parseServiceInput(body: Record<string, unknown>): OrganizationServiceInput {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : slugify(name);
  const durationMinutes = Number(body.durationMinutes);

  if (!name || name.length < 2) {
    throw new Error("Service name is required.");
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("durationMinutes must be a positive number.");
  }

  const priceCents = body.priceEuros !== undefined
    ? parseEuroPriceInputToCents(body.priceEuros as string | number | null)
    : body.priceCents === null || body.priceCents === undefined || body.priceCents === ""
      ? null
      : Number(body.priceCents);

  if (priceCents !== null && (!Number.isFinite(priceCents) || priceCents < 0)) {
    throw new Error("priceCents must be zero or a positive number.");
  }

  return {
    slug,
    name,
    durationMinutes: Math.floor(durationMinutes),
    priceCents: priceCents === null ? null : Math.floor(priceCents),
    currency: typeof body.currency === "string" ? body.currency : "EUR",
    isActive: body.isActive !== false,
    aliases: parseAliases(body.aliases),
    description: typeof body.description === "string" ? body.description : null,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.floor(Number(body.sortOrder)) : 100,
  };
}

function parseAliases(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 63) || "service";
}
