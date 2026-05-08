alter type public.suggested_action_type add value if not exists 'create_calendar_event_from_call';
alter type public.suggested_action_type add value if not exists 'update_calendar_event_from_call';
alter type public.suggested_action_type add value if not exists 'cancel_calendar_event_from_call';
alter type public.suggested_action_type add value if not exists 'send_call_followup_email';
alter type public.suggested_action_type add value if not exists 'send_call_followup_whatsapp';
alter type public.suggested_action_type add value if not exists 'request_call_more_info';
alter type public.suggested_action_type add value if not exists 'callback_reminder';

do $$
begin
  create type public.quick_call_note_status as enum (
    'draft',
    'analyzed',
    'pending_approval',
    'completed',
    'ignored',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.quick_call_intent_type as enum (
    'new_appointment',
    'reschedule_appointment',
    'cancel_appointment',
    'callback_request',
    'generic_note',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.call_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  raw_text text not null,
  status public.quick_call_note_status not null default 'draft',
  intent_type public.quick_call_intent_type not null default 'unknown',
  confidence numeric(4, 3) not null default 0,
  customer_name text,
  customer_email text,
  customer_phone text,
  requested_datetime_text text,
  requested_start timestamptz,
  requested_end timestamptz,
  reason text,
  extracted_constraints jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_notes_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint call_notes_time_order check (
    requested_start is null or requested_end is null or requested_end > requested_start
  )
);

alter table public.appointment_requests
add column if not exists call_note_id uuid references public.call_notes(id) on delete set null,
add column if not exists source_type text;

alter table public.appointment_requests
drop constraint if exists appointment_requests_source_type_check;

alter table public.appointment_requests
add constraint appointment_requests_source_type_check
check (source_type is null or source_type in ('email', 'whatsapp', 'calendar', 'quick_call', 'manual')) not valid;

alter table public.suggested_actions
add column if not exists call_note_id uuid references public.call_notes(id) on delete set null;

create index if not exists call_notes_org_created_idx
on public.call_notes(organization_id, created_at desc);

create index if not exists call_notes_org_created_by_idx
on public.call_notes(organization_id, created_by, created_at desc);

create index if not exists call_notes_org_status_idx
on public.call_notes(organization_id, status, created_at desc);

create index if not exists call_notes_org_intent_idx
on public.call_notes(organization_id, intent_type, created_at desc);

create index if not exists appointment_requests_call_note_idx
on public.appointment_requests(organization_id, call_note_id);

create index if not exists suggested_actions_call_note_idx
on public.suggested_actions(organization_id, call_note_id, status);

drop trigger if exists call_notes_updated_at on public.call_notes;
create trigger call_notes_updated_at
before update on public.call_notes
for each row execute function public.set_updated_at();

alter table public.call_notes enable row level security;

drop policy if exists "Members can read call notes" on public.call_notes;
create policy "Members can read call notes"
on public.call_notes for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can create call notes" on public.call_notes;
create policy "Members can create call notes"
on public.call_notes for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can update call notes" on public.call_notes;
create policy "Members can update call notes"
on public.call_notes for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));
