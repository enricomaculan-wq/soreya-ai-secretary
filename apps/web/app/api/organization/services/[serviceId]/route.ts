import { updateOrganizationService } from "@soreya/database";
import { parseEuroPriceInputToCents } from "@soreya/shared";

import { assertOrganizationAdmin } from "@/lib/server/brain-api";
import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ serviceId: string }> },
) {
  try {
    const auth = await getAuthenticatedServerContext();
    assertOrganizationAdmin(auth.userOrganization.membership.role);
    const { serviceId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const patch: {
      name?: string;
      durationMinutes?: number;
      priceCents?: number | null;
      currency?: string;
      aliases?: string[];
      isActive?: boolean;
    } = {};

    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      patch.name = body.name.trim();
    }

    if (body.durationMinutes !== undefined) {
      const durationMinutes = Number(body.durationMinutes);

      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new Error("durationMinutes must be a positive number.");
      }

      patch.durationMinutes = Math.floor(durationMinutes);
    }

    if (body.priceEuros !== undefined || body.priceCents !== undefined) {
      const priceCents = body.priceEuros !== undefined
        ? parseEuroPriceInputToCents(body.priceEuros as string | number | null)
        : body.priceCents === null || body.priceCents === "" || body.priceCents === undefined
          ? null
          : Number(body.priceCents);

      if (priceCents !== null && (!Number.isFinite(priceCents) || priceCents < 0)) {
        throw new Error("price must be zero or a positive number.");
      }

      patch.priceCents = priceCents === null ? null : Math.floor(priceCents);
    }

    if (typeof body.currency === "string" && body.currency.trim()) {
      patch.currency = body.currency.trim().toUpperCase();
    }

    if (body.aliases !== undefined) {
      patch.aliases = parseAliases(body.aliases);
    }

    if (typeof body.isActive === "boolean") {
      patch.isActive = body.isActive;
    }

    const service = await updateOrganizationService(
      auth.supabase,
      auth.userOrganization.organization.id,
      serviceId,
      patch,
    );

    return Response.json({ service });
  } catch (error) {
    return jsonError(error);
  }
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
