do $$
begin
  create type public.execution_status as enum (
    'dry_run',
    'ready',
    'executing',
    'executed',
    'failed',
    'blocked',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.execution_type as enum (
    'email_reply',
    'whatsapp_reply',
    'calendar_create',
    'calendar_update',
    'calendar_cancel',
    'emergency_email',
    'emergency_whatsapp',
    'calendar_block',
    'callback_reminder'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.suggested_actions
add column if not exists execution_status public.execution_status,
add column if not exists executed_at timestamptz;

create table if not exists public.execution_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  suggested_action_id uuid not null references public.suggested_actions(id) on delete cascade,
  executed_by uuid references auth.users(id) on delete set null,
  execution_type public.execution_type not null,
  status public.execution_status not null default 'ready',
  dry_run boolean not null default true,
  provider text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  final_confirmation_text text,
  created_at timestamptz not null default now(),
  executed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint execution_records_confirmation_present check (
    status in ('blocked', 'cancelled')
    or final_confirmation_text is not null
  )
);

create index if not exists execution_records_org_idx
on public.execution_records(organization_id, created_at desc);

create index if not exists execution_records_suggested_action_idx
on public.execution_records(organization_id, suggested_action_id, created_at desc);

create index if not exists execution_records_status_idx
on public.execution_records(organization_id, status, created_at desc);

create index if not exists execution_records_created_idx
on public.execution_records(created_at desc);

create index if not exists suggested_actions_execution_status_idx
on public.suggested_actions(organization_id, execution_status, created_at desc);

drop trigger if exists execution_records_updated_at on public.execution_records;
create trigger execution_records_updated_at
before update on public.execution_records
for each row execute function public.set_updated_at();

alter table public.execution_records enable row level security;

drop policy if exists "Members can read execution records" on public.execution_records;
create policy "Members can read execution records"
on public.execution_records for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can create execution records" on public.execution_records;
create policy "Members can create execution records"
on public.execution_records for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can update execution records" on public.execution_records;
create policy "Members can update execution records"
on public.execution_records for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));
