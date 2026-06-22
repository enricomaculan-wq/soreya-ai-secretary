#!/usr/bin/env node
/**
 * Applies SQL migrations from supabase/migrations/ to the linked Supabase project.
 *
 * Requires in apps/web/.env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (for schema verification only)
 *
 * For DDL, also set one of:
 *   SUPABASE_DB_PASSWORD
 *   SUPABASE_DB_URL
 *
 * Usage:
 *   node scripts/apply-supabase-migrations.mjs
 *   node scripts/apply-supabase-migrations.mjs --dry-run
 *   node scripts/verify-supabase-schema.mjs
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, "apps/web/.env.local");
const migrationsDir = join(rootDir, "supabase/migrations");
const initialMigration = "20260507000000_initial_schema.sql";

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

function listMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function resolveDbUrl(env) {
  if (env.SUPABASE_DB_URL) {
    return env.SUPABASE_DB_URL;
  }

  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!env.SUPABASE_DB_PASSWORD || !projectRef) {
    return null;
  }

  const region = env.SUPABASE_DB_REGION ?? "eu-west-1";
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = $1 limit 1`,
    [tableName],
  );
  return (result.rowCount ?? 0) > 0;
}

async function runSql(dbUrl, sql) {
  let pg;
  pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function applyMigrationWithPg(dbUrl, fileName) {
  const sql = readFileSync(join(migrationsDir, fileName), "utf8");
  const enumAlterPattern = /^alter type public\.\w+ add value if not exists '[^']+';$/gim;
  const enumAlters = sql.match(enumAlterPattern) ?? [];
  let remainder = sql;

  for (const statement of enumAlters) {
    remainder = remainder.replace(statement, "");
    await runSql(dbUrl, statement);
  }

  remainder = remainder.trim();
  if (remainder) {
    await runSql(dbUrl, remainder);
  }

  return true;
}

function applyWithSupabaseCli(env, projectRef) {
  if (!env.SUPABASE_DB_PASSWORD || !projectRef) {
    return false;
  }

  const link = spawnSync(
    "supabase",
    ["link", "--project-ref", projectRef, "-p", env.SUPABASE_DB_PASSWORD],
    { cwd: rootDir, stdio: "pipe", encoding: "utf8" },
  );

  if (link.status !== 0 && !`${link.stdout ?? ""}${link.stderr ?? ""}`.includes("Finished")) {
    console.warn("supabase link:", link.stderr || link.stdout);
  }

  const push = spawnSync("supabase", ["db", "push", "--include-all"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, SUPABASE_DB_PASSWORD: env.SUPABASE_DB_PASSWORD },
  });

  return push.status === 0;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const env = { ...process.env, ...loadEnvFile(envPath) };
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const dbUrl = resolveDbUrl(env);
  const files = listMigrationFiles();

  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL in apps/web/.env.local");
    process.exit(1);
  }

  console.log(`Supabase project: ${projectRef ?? env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`Migration files: ${files.length}`);

  if (!dbUrl) {
    console.error("\nMissing database credentials.");
    console.error("Add to apps/web/.env.local:");
    console.error("  SUPABASE_DB_PASSWORD=<Database password from Supabase Dashboard → Settings → Database>");
    console.error("Optional if auto-detect fails:");
    console.error("  SUPABASE_DB_REGION=eu-west-1");
    console.error("Or paste the Session pooler URI from Dashboard → Connect:");
    console.error("  SUPABASE_DB_URL=postgresql://postgres.<ref>:...@aws-0-<region>.pooler.supabase.com:5432/postgres");
    console.error("\nThen rerun:");
    console.error("  npm run setup:supabase");
    console.error("\nManual fallback: run each file in Supabase SQL Editor (one file per run):");
    for (const file of files) {
      console.error(`  supabase/migrations/${file}`);
    }
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Missing pg package. Run: npm install --workspace-root pg");
    process.exit(1);
  }

  const probeClient = new pg.default.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await probeClient.connect();
  let skipInitial = false;
  try {
    skipInitial = await tableExists(probeClient, "organizations");
  } finally {
    await probeClient.end();
  }

  const toApply = skipInitial ? files.filter((file) => file !== initialMigration) : files;

  if (skipInitial) {
    console.log(`Skipping ${initialMigration} (core tables already present).`);
  }

  if (dryRun) {
    console.log("\nDry run — would apply:");
    for (const file of toApply) {
      console.log(`  ${file}`);
    }
    return;
  }

  console.log(`\nApplying ${toApply.length} migration file(s)…\n`);

  for (const file of toApply) {
    process.stdout.write(`→ ${file} … `);
    try {
      await applyMigrationWithPg(dbUrl, file);
      console.log("ok");
    } catch (error) {
      console.log("FAILED");
      console.error(error instanceof Error ? error.message : error);
      console.error("\nStopped on first error. Fix the issue, then rerun (migrations are idempotent).");
      process.exit(1);
    }
  }

  console.log("\nAll migrations applied.");
  console.log("Run schema verification:");
  console.log("  npm run verify:supabase");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
