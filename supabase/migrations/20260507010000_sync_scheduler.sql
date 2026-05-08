do $$
begin
  create type public.sync_provider as enum (
    'google_calendar',
    'microsoft_calendar',
    'gmail',
    'microsoft_mail',
    'whatsapp'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sync_status as enum (
    'queued',
    'running',
    'success',
    'partial_success',
    'failed',
    'skipped'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sync_job_type as enum (
    'calendar_sync',
    'email_sync',
    'whatsapp_webhook',
    'daily_summary_generate',
    'full_sync'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.connected_accounts
add column if not exists last_token_refresh_at timestamptz,
add column if not exists last_sync_at timestamptz,
add column if not exists last_sync_status public.sync_status,
add column if not exists last_sync_error text;

update public.connected_accounts
set last_sync_at = coalesce(last_sync_at, last_synced_at)
where last_synced_at is not null;

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.sync_provider not null,
  job_type public.sync_job_type not null,
  status public.sync_status not null default 'queued',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_read integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sync_logs_counts_non_negative check (
    records_read >= 0
    and records_created >= 0
    and records_updated >= 0
    and records_skipped >= 0
  )
);

create index if not exists sync_logs_org_created_idx
on public.sync_logs(organization_id, created_at desc);

create index if not exists sync_logs_provider_idx
on public.sync_logs(organization_id, provider, created_at desc);

create index if not exists sync_logs_job_type_idx
on public.sync_logs(organization_id, job_type, created_at desc);

create index if not exists sync_logs_status_idx
on public.sync_logs(organization_id, status, created_at desc);

create index if not exists connected_accounts_refresh_due_idx
on public.connected_accounts(organization_id, token_expires_at)
where token_expires_at is not null and encrypted_refresh_token is not null;

create index if not exists connected_accounts_last_sync_status_idx
on public.connected_accounts(organization_id, provider, last_sync_status, last_sync_at desc);

alter table public.sync_logs enable row level security;

drop policy if exists "Members can read sync logs" on public.sync_logs;
create policy "Members can read sync logs"
on public.sync_logs for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can create sync logs" on public.sync_logs;
create policy "Members can create sync logs"
on public.sync_logs for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can update sync logs" on public.sync_logs;
create policy "Members can update sync logs"
on public.sync_logs for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));
