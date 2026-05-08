# Security Checklist

Use this checklist before connecting production providers or enabling any real execution path.

## Supabase

- RLS is enabled on user, organization, connected account, message, approval, audit and execution tables.
- Organization-scoped policies prevent cross-tenant reads and writes.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side jobs or controlled migration/admin workflows.
- Client apps use only anon/public Supabase keys.

## Secrets And Tokens

- Calendar tokens are encrypted with `CALENDAR_TOKEN_ENCRYPTION_KEY`.
- Email tokens are encrypted with `EMAIL_TOKEN_ENCRYPTION_KEY`.
- WhatsApp tokens are encrypted with `WHATSAPP_TOKEN_ENCRYPTION_KEY`.
- Notification quick actions use short-lived HMAC tokens signed with `SIGNED_ACTION_TOKEN_SECRET`.
- `SIGNED_ACTION_TOKEN_TTL_SECONDS` is short, defaulting to 300 seconds.
- Encryption keys are long random values and are never committed.
- OAuth client secrets, provider access tokens and service-role keys are never exposed client-side.

## Webhooks And OAuth

- WhatsApp GET verification checks `WHATSAPP_VERIFY_TOKEN`.
- WhatsApp POST validates `X-Hub-Signature-256` with `WHATSAPP_APP_SECRET`.
- Development may skip WhatsApp POST signatures only when `WHATSAPP_APP_SECRET` is missing; production must block unsigned or invalid payloads.
- OAuth redirect URLs match the exact deployed domain and callback route.
- Provider scopes are minimal: read-only calendar/email scopes until execution is intentionally enabled.

## API Rate Limits

- `ENABLE_RATE_LIMIT=true` is set before exposing public webhook or action routes.
- `RATE_LIMIT_WINDOW_SECONDS` and `RATE_LIMIT_MAX_REQUESTS` are tuned for production traffic.
- Rate limits protect WhatsApp webhook POST, notification actions, execution, sync run and Quick Call analysis.
- The in-memory limiter is best-effort and should be replaced or backed by shared storage for multi-instance production.

## Notification And Smartwatch Actions

- Smartwatch approval is not execution; it can only move a pending approval to approved.
- Smartwatch ignore can only move a pending approval to ignored.
- Notification actions require either an authenticated user session or a valid signed action token.
- Signed action tokens must match organization, user, action type, device when present and suggested action when present.
- Expired, mismatched or malformed action tokens are blocked and audited when safely attributable.
- Emergency smartwatch actions may open mobile or prepare previews/pending approvals only; they never send messages or mutate calendars.

## Execution Safety

- `EXECUTION_DRY_RUN=true` by default.
- `ENABLE_EMAIL_EXECUTION=false`, `ENABLE_WHATSAPP_EXECUTION=false` and `ENABLE_CALENDAR_EXECUTION=false` by default.
- Approval decisions and execution records are separate concepts and separate tables.
- Real execution requires approved `suggested_actions` plus final confirmation text exactly equal to `EXECUTE`.
- If `EXECUTION_DRY_RUN=false` but the relevant provider execution flag is false, execution is blocked.
- Already executed actions are blocked idempotently.
- Duplicate `executing` or `executed` execution records block repeated execution attempts.
- `execution_duplicate_blocked` audit logs are written for duplicate execution attempts.
- Audit logs record approval, edit, rejection, ignored and execution events.

## Production Env Requirements

- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `SIGNED_ACTION_TOKEN_SECRET`
- `ENABLE_RATE_LIMIT=true`
- `EXECUTION_DRY_RUN=true` until real provider adapters are fully reviewed.
- Provider execution flags remain false unless final provider execution has been explicitly approved and tested.

## Privacy

- Collect only message/calendar data needed for assistant workflows.
- Document retention and deletion expectations before production launch.
- Review GDPR roles, lawful basis, DPA needs and user data export/delete procedures.
