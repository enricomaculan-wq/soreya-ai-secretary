# Soreya

Soreya is an approval-first AI secretary for email, calendar, WhatsApp Business, quick call notes, daily summaries and emergency workflows. It can analyze inbound context and prepare suggested actions, but external sends and calendar mutations stay behind explicit approval and dry-run safety.

## Monorepo

- `apps/web`: Next.js dashboard, API routes, provider OAuth callbacks, health/status views.
- `apps/mobile`: Expo mobile app for approvals, notifications and quick operator workflows.
- `packages/ai`: OpenAI-powered and heuristic analysis engines.
- `packages/database`: Supabase client helpers and database access functions.
- `packages/shared`: shared types and domain contracts.
- `supabase/migrations`: SQL migrations to apply manually when connecting a real Supabase project.

## Approval-First Rule

No external action should run automatically. Email sends, WhatsApp replies and calendar writes must be proposed as `suggested_actions`, approved by a user, and then pass execution safety checks. In this Production Setup phase, `EXECUTION_DRY_RUN=true` and real provider execution flags stay `false`.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env examples:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

3. Fill env values only for the provider you are connecting next. Start with Supabase, then OpenAI, then read-only calendar/email providers.

4. Start the web app:

```bash
npm run dev:web
```

5. Start the mobile app:

```bash
npm run dev:mobile
```

## Environment

The canonical examples are `apps/web/.env.example` and `apps/mobile/.env.example`.

Server-side provider secrets belong in `apps/web/.env.local`. Mobile only needs `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and the mobile push feature flag. Never put service-role keys, OAuth client secrets, provider access tokens or encryption keys in the mobile env.

Gmail and Microsoft Mail support backward-compatible fallback to the calendar OAuth credentials, but the preferred production setup is to use dedicated `GOOGLE_GMAIL_*` and `MICROSOFT_MAIL_*` variables.

## Health And Status

- `GET /api/health` returns app name, environment, timestamp, provider configured booleans, missing env names and execution safety status. It never returns secret values.
- Settings includes a System Status panel for Supabase, OpenAI, Google Calendar, Gmail, Microsoft Calendar, Microsoft Mail, WhatsApp Business, Expo Push, Sync scheduler and Execution dry-run.

## Migrations

List migrations:

```bash
npm run migrations:list
```

Apply them manually in Supabase SQL editor or with the Supabase CLI after selecting the real project. Apply in filename order from `supabase/migrations`. Do not use the service-role key in client apps.

## Provider Order

1. Supabase
2. OpenAI
3. Google Calendar
4. Gmail
5. Microsoft Calendar/Mail
6. WhatsApp Business
7. Expo Push
8. Real execution

## Dry Run

Dry-run means Soreya records the execution attempt and response preview, but it does not send email, does not send WhatsApp messages and does not mutate calendars. Keep `EXECUTION_DRY_RUN=true` until the final production execution review is complete.

## What Is Not Automatic

- No email is sent automatically.
- No WhatsApp reply is sent automatically.
- No calendar event is created, updated or deleted automatically.
- Sync reads calendars/messages and refreshes tokens only.
- Notifications alert users; they do not approve or execute actions.

## Pre-Production Checklist

- Supabase project connected, migrations applied and RLS reviewed.
- Web and mobile env values filled from the examples.
- `/api/health` shows expected provider readiness without exposing secrets.
- OAuth redirect URLs match local, preview and production domains.
- Token encryption keys are generated and stored only server-side.
- WhatsApp webhook GET verify token works; POST signature verification is completed before production.
- `ENABLE_SCHEDULED_SYNC=true` only after `SYNC_SECRET` is configured.
- `EXECUTION_DRY_RUN=true` remains enabled until real provider adapters and final approval gates are reviewed.
- `ENABLE_EMAIL_EXECUTION`, `ENABLE_WHATSAPP_EXECUTION` and `ENABLE_CALENDAR_EXECUTION` remain `false` for this phase.
- `npm run verify` passes.
