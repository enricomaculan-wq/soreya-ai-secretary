#!/usr/bin/env node
/**
 * Applies the Brain migration (if needed) and seeds Brain settings + services
 * for the first organization in the Supabase project.
 *
 * Requires in apps/web/.env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * For migration DDL, also set one of:
 *   SUPABASE_DB_PASSWORD  (uses supabase db push)
 *   SUPABASE_DB_URL       (direct postgres connection string)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, "apps/web/.env.local");
const migrationPath = join(rootDir, "supabase/migrations/20260603140000_organization_brain.sql");

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value;
  }

  return values;
}

const env = { ...process.env, ...loadEnvFile(envPath) };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seedServices = [
  {
    slug: "igiene",
    name: "Igiene dentale",
    duration_minutes: 45,
    price_cents: 8000,
    currency: "EUR",
    is_active: true,
    aliases: ["pulizia denti", "detartrasi", "igiene"],
    description: null,
    sort_order: 10,
  },
  {
    slug: "visita",
    name: "Visita di controllo",
    duration_minutes: 30,
    price_cents: 5000,
    currency: "EUR",
    is_active: true,
    aliases: ["controllo", "visita"],
    description: null,
    sort_order: 20,
  },
  {
    slug: "preventivo",
    name: "Preventivo impianto",
    duration_minutes: 60,
    price_cents: null,
    currency: "EUR",
    is_active: true,
    aliases: ["preventivo", "impianto"],
    description: null,
    sort_order: 30,
  },
];

const brainSettings = {
  reasoningMode: "balanced",
  defaultReplyTone: "professional",
  requireServiceBeforeSlots: false,
  requireExplicitDate: true,
  ownerStyleNotes:
    "Saluta per nome, tono professionale ma caldo. Non promettere appuntamenti in giornata.",
};

async function tableExists() {
  const { error } = await supabase.from("organization_services").select("id").limit(1);

  if (!error) {
    return true;
  }

  if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
    return false;
  }

  throw error;
}

async function applyMigrationWithPg() {
  const dbUrl = env.SUPABASE_DB_URL
    ?? (env.SUPABASE_DB_PASSWORD && projectRef
      ? `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${projectRef}.supabase.co:5432/postgres`
      : null);

  if (!dbUrl) {
    return false;
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Install pg to use SUPABASE_DB_URL: npm install --workspace-root pg");
    return false;
  }

  const sql = readFileSync(migrationPath, "utf8");
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied Brain migration via direct database connection.");
    return true;
  } finally {
    await client.end();
  }
}

function applyMigrationWithCli() {
  if (!env.SUPABASE_DB_PASSWORD || !projectRef) {
    return false;
  }

  const link = spawnSync(
    "supabase",
    ["link", "--project-ref", projectRef, "-p", env.SUPABASE_DB_PASSWORD],
    { cwd: rootDir, stdio: "pipe", encoding: "utf8" },
  );

  if (link.status !== 0 && !link.stdout?.includes("Finished")) {
    console.warn("supabase link:", link.stderr || link.stdout);
  }

  const push = spawnSync(
    "supabase",
    ["db", "push", "--include-all"],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env, SUPABASE_DB_PASSWORD: env.SUPABASE_DB_PASSWORD },
    },
  );

  if (push.status === 0) {
    console.log("Applied migrations via supabase db push.");
    return true;
  }

  return false;
}

async function seedBrain(organizationId) {
  const { data: organization, error: readError } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (readError) {
    throw readError;
  }

  const currentSettings =
    organization.settings && typeof organization.settings === "object" && !Array.isArray(organization.settings)
      ? organization.settings
      : {};

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      settings: { ...currentSettings, brain: brainSettings },
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (updateError) {
    throw updateError;
  }

  const { data: existingServices, error: servicesError } = await supabase
    .from("organization_services")
    .select("slug")
    .eq("organization_id", organizationId);

  if (servicesError) {
    throw servicesError;
  }

  const existingSlugs = new Set((existingServices ?? []).map((row) => row.slug));
  const toInsert = seedServices
    .filter((service) => !existingSlugs.has(service.slug))
    .map((service) => ({
      organization_id: organizationId,
      ...service,
      updated_at: new Date().toISOString(),
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("organization_services").insert(toInsert);
    if (insertError) {
      throw insertError;
    }
    console.log(`Inserted ${toInsert.length} Brain services.`);
  } else {
    console.log("Brain services already present — skipped insert.");
  }

  console.log("Brain settings saved on organization.");
}

async function main() {
  console.log(`Supabase project: ${projectRef ?? supabaseUrl}`);

  if (!(await tableExists())) {
    console.log("organization_services table missing — applying migration…");
    const applied = (await applyMigrationWithPg()) || applyMigrationWithCli();

    if (!applied) {
      console.error("\nCould not apply migration automatically.");
      console.error("Add SUPABASE_DB_PASSWORD or SUPABASE_DB_URL to apps/web/.env.local, then rerun:");
      console.error("  node scripts/setup-brain.mjs");
      console.error("\nOr paste this file in Supabase SQL Editor:");
      console.error(`  ${migrationPath}`);
      process.exit(1);
    }

    if (!(await tableExists())) {
      console.error("Migration reported success but organization_services is still missing.");
      process.exit(1);
    }
  } else {
    console.log("Brain migration already applied.");
  }

  const { data: organizations, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);

  if (orgError) {
    throw orgError;
  }

  const organization = organizations?.[0];
  if (!organization) {
    console.error("No organization found — complete onboarding first.");
    process.exit(1);
  }

  console.log(`Seeding Brain for organization: ${organization.name} (${organization.id})`);
  await seedBrain(organization.id);
  console.log("Brain setup complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
