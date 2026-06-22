import type {
  Json,
  OrganizationBrainSettings,
  OrganizationService,
  OrganizationServiceInput,
} from "@soreya/shared";
import {
  DEFAULT_ORGANIZATION_BRAIN_SETTINGS,
  mergeOrganizationSettingsBrain,
  parseOrganizationBrainSettings,
} from "@soreya/shared";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@soreya/shared";

type SoreyaSupabaseClient = SupabaseClient<Database>;

type OrganizationServiceRow = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  currency: string;
  is_active: boolean;
  aliases: string[] | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function getOrganizationServices(
  client: SoreyaSupabaseClient,
  organizationId: string,
  options?: { activeOnly?: boolean },
): Promise<OrganizationService[]> {
  let query = client
    .from("organization_services")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toOrganizationService);
}

export async function createOrganizationService(
  client: SoreyaSupabaseClient,
  organizationId: string,
  input: OrganizationServiceInput,
): Promise<OrganizationService> {
  const { data, error } = await client
    .from("organization_services")
    .insert({
      organization_id: organizationId,
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      duration_minutes: input.durationMinutes,
      price_cents: input.priceCents ?? null,
      currency: input.currency?.trim().toUpperCase() || "EUR",
      is_active: input.isActive ?? true,
      aliases: input.aliases ?? [],
      description: input.description?.trim() || null,
      sort_order: input.sortOrder ?? 100,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toOrganizationService(data as OrganizationServiceRow);
}

export async function updateOrganizationService(
  client: SoreyaSupabaseClient,
  organizationId: string,
  serviceId: string,
  input: Partial<OrganizationServiceInput>,
): Promise<OrganizationService> {
  const patch: {
    updated_at: string;
    slug?: string;
    name?: string;
    duration_minutes?: number;
    price_cents?: number | null;
    currency?: string;
    is_active?: boolean;
    aliases?: string[];
    description?: string | null;
    sort_order?: number;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.slug !== undefined) patch.slug = input.slug.trim().toLowerCase();
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.durationMinutes !== undefined) patch.duration_minutes = input.durationMinutes;
  if (input.priceCents !== undefined) patch.price_cents = input.priceCents;
  if (input.currency !== undefined) patch.currency = input.currency.trim().toUpperCase();
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.aliases !== undefined) patch.aliases = input.aliases;
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const { data, error } = await client
    .from("organization_services")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", serviceId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toOrganizationService(data as OrganizationServiceRow);
}

export async function deleteOrganizationService(
  client: SoreyaSupabaseClient,
  organizationId: string,
  serviceId: string,
): Promise<void> {
  const { error } = await client
    .from("organization_services")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", serviceId);

  if (error) {
    throw error;
  }
}

export async function getOrganizationBrainSettings(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<OrganizationBrainSettings> {
  const { data, error } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (error) {
    throw error;
  }

  return parseOrganizationBrainSettings(data.settings as Json);
}

export async function updateOrganizationBrainSettings(
  client: SoreyaSupabaseClient,
  organizationId: string,
  settings: OrganizationBrainSettings,
): Promise<OrganizationBrainSettings> {
  const { data: current, error: readError } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (readError) {
    throw readError;
  }

  const nextSettings = mergeOrganizationSettingsBrain(current.settings as Json, settings);
  const { data, error } = await client
    .from("organizations")
    .update({
      settings: nextSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)
    .select("settings")
    .single();

  if (error) {
    throw error;
  }

  return parseOrganizationBrainSettings(data.settings as Json);
}

export async function getOrganizationBrainContext(
  client: SoreyaSupabaseClient,
  organizationId: string,
) {
  const [settings, services] = await Promise.all([
    getOrganizationBrainSettings(client, organizationId),
    getOrganizationServices(client, organizationId, { activeOnly: true }),
  ]);

  return { settings, services };
}

function toOrganizationService(row: OrganizationServiceRow): OrganizationService {
  return {
    id: row.id,
    organizationId: row.organization_id,
    slug: row.slug,
    name: row.name,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    currency: row.currency,
    isActive: row.is_active,
    aliases: row.aliases ?? [],
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export { DEFAULT_ORGANIZATION_BRAIN_SETTINGS };
