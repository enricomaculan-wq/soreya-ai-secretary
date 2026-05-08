# Provider Setup

This guide is intentionally operational and ordered for a safe production connection. Keep real execution disabled while completing these steps.

## Supabase

1. Create a Supabase project.
2. Apply SQL migrations from `supabase/migrations` in filename order.
3. Enable and review RLS policies.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in the web environment.
5. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the mobile environment.

## OpenAI

1. Create an API key.
2. Set `OPENAI_API_KEY`.
3. Set `OPENAI_MODEL` explicitly, even if the code has a fallback.
4. Test analysis flows before provider sync is enabled.

## Google OAuth Calendar

1. Create OAuth credentials in Google Cloud.
2. Add redirect URL: `/api/calendar/google/callback`.
3. Configure read-only calendar scopes.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` and `CALENDAR_TOKEN_ENCRYPTION_KEY`.
5. Connect from Settings and run a manual sync.

## Google OAuth Gmail

1. Prefer dedicated Gmail OAuth credentials.
2. Add redirect URL: `/api/email/google/callback`.
3. Configure read-only Gmail scopes.
4. Set `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, `GOOGLE_GMAIL_REDIRECT_URI` and `EMAIL_TOKEN_ENCRYPTION_KEY`.
5. Backward-compatible fallback to `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` exists, but dedicated values are preferred.

## Microsoft Azure App Registration

1. Create app registrations for Calendar and Mail, or one carefully scoped app if you accept shared credentials.
2. Add redirect URLs: `/api/calendar/microsoft/callback` and `/api/email/microsoft/callback`.
3. Configure read-only Graph scopes: `Calendars.Read`, `Mail.Read`, `User.Read`, `offline_access`.
4. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `MICROSOFT_REDIRECT_URI`.
5. Set dedicated mail values: `MICROSOFT_MAIL_CLIENT_ID`, `MICROSOFT_MAIL_CLIENT_SECRET`, `MICROSOFT_MAIL_TENANT_ID`, `MICROSOFT_MAIL_REDIRECT_URI`.

## WhatsApp Business Cloud API

1. Create or select the Meta app and WhatsApp Business account.
2. Set `WHATSAPP_CLOUD_API_VERSION`, `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_PHONE_NUMBER_ID`.
3. Generate a webhook verify token and set `WHATSAPP_VERIFY_TOKEN`.
4. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_TOKEN_ENCRYPTION_KEY`.
5. Configure webhook URL: `/api/whatsapp/webhook`.
6. Keep sending disabled. Replies are suggestions and require approval.
7. Complete POST signature verification before production.

## Expo Push Notifications

1. Configure the Expo project and EAS project ID.
2. Set mobile `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true` when ready to request permissions.
3. Set web `ENABLE_PUSH_NOTIFICATIONS=true` and `EXPO_ACCESS_TOKEN` only when server-side delivery should be active.
4. Confirm notifications are informational only and do not execute actions.

## Vercel Deployment

1. Add all web env values to the Vercel project.
2. Use separate env values for preview and production.
3. Confirm OAuth redirect URLs include the deployed domains.
4. Check `/api/health` after deploy.
5. Keep execution dry-run enabled for the first production smoke tests.

## Cron And Scheduler

1. Set `SYNC_SECRET` to a long random value.
2. Configure cron to call `POST /api/sync/run` with header `x-sync-secret`.
3. Set `ENABLE_SCHEDULED_SYNC=true` only after manual sync works.
4. Tune `SYNC_LOOKBACK_DAYS`, `SYNC_LOOKAHEAD_DAYS`, `SYNC_EMAIL_LIMIT` and `SYNC_CALENDAR_LIMIT`.
5. Monitor sync logs and token refresh results.
