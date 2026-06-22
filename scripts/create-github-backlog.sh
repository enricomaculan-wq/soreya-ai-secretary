#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

create_issue() {
  local title="$1"
  local label="$2"
  local body="$3"
  gh issue create --title "$title" --label "$label" --body "$body"
}

# Epic A — Infrastructure
create_issue "[P0] Apply Phase 1 RLS migration on Supabase" "P0" "$(cat <<'EOF'
## Summary
Apply `supabase/migrations/20260603120000_phase1_rls_and_approval_fixes.sql` on staging and production so RLS fixes actually take effect.

## Files / area
- `supabase/migrations/20260603120000_phase1_rls_and_approval_fixes.sql`

## Acceptance criteria
- [ ] Migration applied on staging and production Supabase projects
- [ ] Emergency insert with `pending_approval` works for org members
- [ ] `suggested_actions` UPDATE allowlist enforced (no client transition to `executed`)
- [ ] Calendar cache write limited to owner/admin

## Estimate
S
EOF
)"

create_issue "[P0] Staging/production env checklist verified" "P0" "$(cat <<'EOF'
## Summary
Document and verify required environment variables on staging before real-user testing.

## Files / area
- `apps/web/.env.example`
- `apps/mobile/.env.example`
- `docs/SECURITY_CHECKLIST.md`

## Acceptance criteria
- [ ] Staging has Supabase, `DEMO_ACCESS_PASSWORD`, `WHATSAPP_APP_SECRET`, `ENABLE_RATE_LIMIT=true`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Mobile physical devices use reachable `EXPO_PUBLIC_WEB_APP_URL`
- [ ] `EXECUTION_DRY_RUN=true` until WhatsApp real execution is intentionally tested
- [ ] Checklist recorded with `/api/health` presence summary (no secrets)

## Dependencies
- Blocks on Phase 1 migration (# depends on first P0 migration issue)

## Estimate
S
EOF
)"

create_issue "[P0] CI: run npm run verify on every PR" "P0" "$(cat <<'EOF'
## Summary
Add GitHub Actions workflow so regressions are caught before merge.

## Files / area
- New `.github/workflows/verify.yml`

## Acceptance criteria
- [ ] Workflow runs on `pull_request` and push to `main`
- [ ] Steps: `npm ci`, `npm run test`, web build, web lint, mobile `tsc`, mobile lint
- [ ] Document network/fonts requirement if needed

## Estimate
S
EOF
)"

create_issue "[P0] Staging smoke deploy after merge" "P0" "$(cat <<'EOF'
## Summary
Verify Vercel/staging deploy after CI is green.

## Acceptance criteria
- [ ] Staging deploy succeeds on main
- [ ] `GET /api/health` returns 200 without leaking secrets
- [ ] Login and demo gate work when `DEMO_ACCESS_PASSWORD` is set
- [ ] CI verify green on main branch

## Dependencies
- Env checklist + CI workflow issues

## Estimate
S
EOF
)"

# Epic B — Security
create_issue "[P1] Audit sensitive APIs vs demo access gate" "P1" "$(cat <<'EOF'
## Summary
Map every `/api/*` route to public / auth / demo-cookie / service-role and close gaps.

## Files / area
- `apps/web/lib/demo-access.ts`
- `apps/web/proxy.ts`
- `apps/web/app/api/**`

## Acceptance criteria
- [ ] Route matrix documented in issue or `docs/`
- [ ] Critical routes in `protectedApiPrefixes` or explicitly excluded with rationale
- [ ] Unit test covers critical prefix list

## Estimate
M
EOF
)"

create_issue "[P1] Harden /api/health for production" "P1" "$(cat <<'EOF'
## Summary
Reduce information disclosure from health endpoint in production.

## Files / area
- `apps/web/app/api/health/route.ts`

## Acceptance criteria
- [ ] Production returns minimal payload OR endpoint protected (secret header / allowlist)
- [ ] No per-env variable names exposed in prod (or aggregated only)
- [ ] README updated

## Estimate
S
EOF
)"

create_issue "[P1] Require Upstash rate limit in multi-instance production" "P1" "$(cat <<'EOF'
## Summary
Configure distributed rate limiting for Vercel multi-instance deployments.

## Files / area
- `apps/web/lib/server/rate-limit.ts`
- `apps/web/lib/server/rate-limit-upstash.ts`

## Acceptance criteria
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set in staging/prod
- [ ] Provider status reflects distributed mode
- [ ] Manual test: 429 after threshold on a limited route

## Estimate
S
EOF
)"

# Epic C — Tests
create_issue "[P1] Integration test: WhatsApp webhook signature" "P1" "$(cat <<'EOF'
## Summary
Add tests for HMAC verification on WhatsApp webhook POST.

## Files / area
- `apps/web/lib/server/whatsapp-webhook.ts`
- `apps/web/app/api/whatsapp/webhook/route.ts`

## Acceptance criteria
- [ ] Valid/invalid signature cases covered
- [ ] Production without `WHATSAPP_APP_SECRET` rejects requests
- [ ] Dev behavior documented when secret missing

## Estimate
M
EOF
)"

create_issue "[P1] Integration test: execution dry-run E2E" "P1" "$(cat <<'EOF'
## Summary
Test approved action + EXECUTE creates dry_run record without external side effects.

## Files / area
- `apps/web/lib/server/execution-engine.ts`
- `apps/web/app/api/execution/*`

## Acceptance criteria
- [ ] Approved + `EXECUTE` → `dry_run` execution record
- [ ] Non-approved → blocked
- [ ] Wrong confirmation text → blocked

## Dependencies
- Phase 1 migration applied

## Estimate
M
EOF
)"

create_issue "[P1] Integration test: emergency RLS pending_approval" "P1" "$(cat <<'EOF'
## Summary
Verify emergency actions insert as `pending_approval` under RLS.

## Files / area
- `apps/web/lib/server/emergency-api.ts`
- `apps/mobile/app/(tabs)/emergency.tsx`

## Acceptance criteria
- [ ] Member can create emergency visible in approval queue
- [ ] Reschedule proposals remain `draft`
- [ ] Test documents migration prerequisite

## Dependencies
- Phase 1 migration applied

## Estimate
M
EOF
)"

create_issue "[P1] Integration test: mobile Bearer session on web API" "P1" "$(cat <<'EOF'
## Summary
Ensure mobile `Authorization: Bearer` works on shared Next.js APIs.

## Files / area
- `apps/web/lib/server/supabase.ts`
- `apps/mobile/lib/web-api.ts`

## Acceptance criteria
- [ ] Valid Bearer → 200 on `/api/approvals/list`
- [ ] Missing/expired token → 401
- [ ] Cookie auth on web still works

## Estimate
S
EOF
)"

create_issue "[P2] Expand critical test suite to 20+ cases" "P2" "$(cat <<'EOF'
## Summary
Grow automated coverage for approval, execution, webhook, and privacy paths.

## Acceptance criteria
- [ ] ≥20 tests pass in CI
- [ ] Covers demo-access, rate-limit, privacy export shape, inbox auth

## Dependencies
- Integration test issues

## Estimate
M
EOF
)"

# Epic D — Execution
create_issue "[P1] Email execution adapter: Gmail send reply" "P1" "$(cat <<'EOF'
## Summary
Implement real Gmail send for approved `send_email_reply` actions behind flags.

## Files / area
- `apps/web/lib/server/execution-engine.ts`
- New `email-execution.ts`, token refresh

## Acceptance criteria
- [ ] `ENABLE_EMAIL_EXECUTION=true` + `EXECUTION_DRY_RUN=false` sends via connected account
- [ ] Failures recorded in `execution_records`
- [ ] Preview shows correct recipient/subject/body

## Estimate
L
EOF
)"

create_issue "[P1] Email execution adapter: Microsoft 365" "P1" "$(cat <<'EOF'
## Summary
Implement Graph sendMail for Microsoft mail actions.

## Acceptance criteria
- [ ] Same behavior as Gmail adapter for Microsoft-connected orgs
- [ ] Token refresh and error handling aligned

## Dependencies
- Gmail email adapter issue

## Estimate
L
EOF
)"

create_issue "[P1] Calendar execution adapter: Google Calendar" "P1" "$(cat <<'EOF'
## Summary
Enable calendar create/update/cancel execution behind `ENABLE_CALENDAR_EXECUTION`.

## Acceptance criteria
- [ ] At least create + update for approved calendar actions
- [ ] OAuth scopes documented; reconnect flow if write scope required
- [ ] Clear blocked message when scopes insufficient

## Estimate
XL
EOF
)"

create_issue "[P2] Calendar execution adapter: Microsoft Calendar" "P2" "$(cat <<'EOF'
## Summary
Microsoft Graph calendar mutations for approved actions.

## Dependencies
- Google calendar execution adapter

## Estimate
L
EOF
)"

create_issue "[P2] Align /api/whatsapp/send-approved with execution engine" "P2" "$(cat <<'EOF'
## Summary
Remove duplicate/legacy WhatsApp send path; single documented execution flow.

## Files / area
- `apps/web/app/api/whatsapp/send-approved/route.ts`

## Acceptance criteria
- [ ] Route deprecated or delegates to execution engine / `sendWhatsAppTextMessage`
- [ ] Docs reference `/api/execution/execute` only

## Estimate
S
EOF
)"

create_issue "[P1] Runbook: real WhatsApp execution in staging" "P1" "$(cat <<'EOF'
## Summary
Document safe procedure to test real WhatsApp sends in staging.

## Files / area
- New or extend `docs/EXECUTION.md`, `docs/SECURITY_CHECKLIST.md`

## Acceptance criteria
- [ ] Steps: env flags, connected account, approve, EXECUTE, verify in Meta
- [ ] Rollback: re-enable `EXECUTION_DRY_RUN=true`

## Estimate
S
EOF
)"

# Epic E — Web UX
create_issue "[P1] Unify /app vs /dashboard operational home" "P1" "$(cat <<'EOF'
## Summary
Single canonical operational workspace; avoid two competing dashboards.

## Files / area
- `apps/web/app/app/`, `apps/web/app/dashboard/`, navigation components

## Acceptance criteria
- [ ] One canonical route; other redirects or marketing-only
- [ ] Header/footer links updated

## Estimate
M
EOF
)"

create_issue "[P2] Web Settings: GDPR export and deletion request UI" "P2" "$(cat <<'EOF'
## Summary
Expose existing privacy APIs in settings UI.

## Acceptance criteria
- [ ] Download data → `GET /api/privacy/export`
- [ ] Request deletion → `POST /api/privacy/delete-request` with confirmation

## Estimate
S
EOF
)"

create_issue "[P2] i18n sweep: no hardcoded user-facing EN strings" "P2" "$(cat <<'EOF'
## Summary
Move remaining UI strings to `packages/shared/i18n`.

## Acceptance criteria
- [ ] CI grep or script fails on new hardcoded UI strings (allowlist for brands)
- [ ] Mobile settings watch rows translated IT/EN

## Estimate
M
EOF
)"

# Epic F — Mobile
create_issue "[P1] EAS Build: projectId and first internal build" "P1" "$(cat <<'EOF'
## Summary
Ship installable mobile build via EAS for staging QA.

## Files / area
- `apps/mobile/app.config.ts`, `EXPO_PUBLIC_EAS_PROJECT_ID`

## Acceptance criteria
- [ ] EAS project created and id configured
- [ ] Preview/development build installs on device
- [ ] Push token registers against staging Supabase

## Estimate
M
EOF
)"

create_issue "[P1] QA: physical device + watch notification flows" "P1" "$(cat <<'EOF'
## Summary
Manual QA checklist for notifications, deep links, watch approve/ignore.

## Files / area
- `apps/mobile/components/mobile-notification-listeners.tsx`
- `/api/notifications/action`

## Acceptance criteria
- [ ] iOS/Android tap opens correct tab
- [ ] Watch Approve/Ignore hits server API
- [ ] Cold start processes last notification

## Dependencies
- EAS build issue

## Estimate
M
EOF
)"

create_issue "[P2] Mobile: pull-to-refresh and clearer web API errors" "P2" "$(cat <<'EOF'
## Summary
Better UX when `EXPO_PUBLIC_WEB_APP_URL` or session fails.

## Files / area
- `apps/mobile/lib/web-api.ts`, approvals/inbox screens

## Acceptance criteria
- [ ] i18n errors for missing URL, session, network
- [ ] Pull-to-refresh on inbox and approvals

## Estimate
S
EOF
)"

# Epic G — GDPR
create_issue "[P2] Privacy doc: retention and subprocessors" "P2" "$(cat <<'EOF'
## Summary
Add `docs/PRIVACY.md` with data retention and subprocessor list.

## Acceptance criteria
- [ ] Documents cached messages, audit logs, encrypted tokens
- [ ] Lists Supabase, Vercel, Meta, Google, Microsoft, OpenAI, Expo

## Estimate
S
EOF
)"

create_issue "[P2] GDPR export: include cached messages (capped)" "P2" "$(cat <<'EOF'
## Summary
Extend privacy export with recent inbox cache metadata/bodies per policy.

## Files / area
- `apps/web/lib/server/privacy-api.ts`

## Acceptance criteria
- [ ] Export includes last N messages with size cap or pagination
- [ ] No provider secrets in export

## Estimate
M
EOF
)"

create_issue "[P2] Admin workflow for data deletion requests" "P2" "$(cat <<'EOF'
## Summary
Operational procedure (and optional admin endpoint) after `privacy_deletion_requested` audit events.

## Acceptance criteria
- [ ] Documented verify-identity → delete org/user steps
- [ ] Optional protected admin tool

## Dependencies
- Privacy doc issue

## Estimate
M
EOF
)"

# Epic H — Database
create_issue "[P2] Validate NOT VALID constraints and migrate" "P2" "$(cat <<'EOF'
## Summary
Inventory and validate deferred DB constraints.

## Acceptance criteria
- [ ] List NOT VALID constraints
- [ ] Migration runs VALIDATE after data cleanup
- [ ] verify + DB tests pass

## Estimate
M
EOF
)"

create_issue "[P2] RLS: who can trigger sync (member vs admin)" "P2" "$(cat <<'EOF'
## Summary
Align sync permissions with product policy.

## Files / area
- RLS migrations, `/api/sync/run`

## Acceptance criteria
- [ ] Documented who may sync
- [ ] RLS matches policy

## Estimate
M
EOF
)"

create_issue "[P2] Enable scheduled sync in staging" "P2" "$(cat <<'EOF'
## Summary
Cron job for `/api/sync/run` with `SYNC_SECRET`.

## Acceptance criteria
- [ ] Periodic sync_logs entries
- [ ] Inbox populates without manual sync

## Estimate
M
EOF
)"

# Epic I — Hygiene
create_issue "[P3] Remove bogus git index entries (-maxdepth, -type)" "P3" "$(cat <<'EOF'
## Summary
Clean `git status` from accidental path entries.

## Acceptance criteria
- [ ] Clean working tree
- [ ] `.gitignore` prevents recurrence

## Estimate
XS
EOF
)"

create_issue "[P3] Remove or document duplicate root mobile/ folder" "P3" "$(cat <<'EOF'
## Summary
Only `apps/mobile` should be canonical.

## Acceptance criteria
- [ ] Duplicate removed or README explains legacy path

## Estimate
XS
EOF
)"

create_issue "[P2] README: align with demo vs production behavior" "P2" "$(cat <<'EOF'
## Summary
Update README for current Fases 1–4 behavior.

## Acceptance criteria
- [ ] Demo mode, mobile web API, execution flags, migrations, CI documented
- [ ] Matches `.env.example`

## Estimate
S
EOF
)"

echo "Done creating backlog issues."
