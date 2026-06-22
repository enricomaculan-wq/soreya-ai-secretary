#!/usr/bin/env node
/**
 * Verifies that expected Supabase tables/columns exist for the real test path.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, "apps/web/.env.local");

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

    values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  return values;
}

const requiredTables = [
  "organizations",
  "organization_members",
  "connected_accounts",
  "calendar_events_cache",
  "incoming_messages",
  "suggested_actions",
  "appointment_requests",
  "sync_logs",
  "daily_summaries",
  "call_notes",
  "execution_records",
  "notification_preferences",
  "organization_services",
];

const requiredColumns = [
  ["calendar_events_cache", "provider"],
  ["connected_accounts", "last_sync_status"],
  ["connected_accounts", "last_sync_at"],
  ["incoming_messages", "email_provider"],
  ["incoming_messages", "whatsapp_provider"],
];

async function main() {
  const env = { ...process.env, ...loadEnvFile(envPath) };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("== Supabase schema verification ==");
  console.log(`Project: ${url}\n`);

  let failed = false;

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select("*").limit(0);
    const ok = !error;
    console.log(`${ok ? "OK" : "MISSING"}  table ${table}`);
    if (!ok) {
      failed = true;
    }
  }

  console.log("");

  for (const [table, column] of requiredColumns) {
    const { error } = await supabase.from(table).select(column).limit(0);
    const ok = !error;
    console.log(`${ok ? "OK" : "MISSING"}  column ${table}.${column}`);
    if (!ok) {
      failed = true;
    }
  }

  console.log("");
  if (failed) {
    console.log("Some objects are missing. Apply migrations:");
    console.log("  1. Add SUPABASE_DB_PASSWORD to apps/web/.env.local");
    console.log("  2. npm run setup:supabase");
    process.exit(1);
  }

  console.log("Schema looks complete for Phase 1.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
