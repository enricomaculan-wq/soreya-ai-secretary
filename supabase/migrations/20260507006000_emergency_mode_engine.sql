alter type public.emergency_action_type add value if not exists 'reschedule_all_today';
alter type public.emergency_action_type add value if not exists 'reschedule_morning';
alter type public.emergency_action_type add value if not exists 'reschedule_afternoon';
alter type public.emergency_action_type add value if not exists 'notify_delay';
alter type public.emergency_action_type add value if not exists 'block_today';
alter type public.emergency_action_type add value if not exists 'notify_all_today';

alter type public.suggested_action_type add value if not exists 'send_emergency_email';
alter type public.suggested_action_type add value if not exists 'send_emergency_whatsapp';
alter type public.suggested_action_type add value if not exists 'propose_calendar_reschedule';
alter type public.suggested_action_type add value if not exists 'block_calendar_day';
alter type public.suggested_action_type add value if not exists 'notify_delay_email';
alter type public.suggested_action_type add value if not exists 'notify_delay_whatsapp';
alter type public.suggested_action_type add value if not exists 'manual_review';

do $$
begin
  create type public.emergency_action_status as enum (
    'draft',
    'pending_approval',
    'approved',
    'partially_approved',
    'rejected',
    'cancelled',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.emergency_actions
drop constraint if exists emergency_actions_approval_required_for_execution,
drop constraint if exists emergency_actions_approval_data_pair;

drop policy if exists "Members can create emergency actions for approval" on public.emergency_actions;
drop policy if exists "Owners and admins can update emergency actions" on public.emergency_actions;

alter table public.emergency_actions
alter column status drop default;

alter table public.emergency_actions
alter column status type public.emergency_action_status
using case status::text
  when 'approved' then 'approved'::public.emergency_action_status
  when 'rejected' then 'rejected'::public.emergency_action_status
  when 'cancelled' then 'cancelled'::public.emergency_action_status
  when 'executed' then 'completed'::public.emergency_action_status
  else 'pending_approval'::public.emergency_action_status
end;

alter table public.emergency_actions
alter column status set default 'pending_approval'::public.emergency_action_status,
add column if not exists created_by uuid references auth.users(id) on delete set null,
add column if not exists target_date date not null default current_date,
add column if not exists delay_minutes integer,
add column if not exists message_tone text not null default 'professional',
add column if not exists affected_events_count integer not null default 0,
add column if not exists suggested_actions_count integer not null default 0,
add column if not exists metadata jsonb not null default '{}'::jsonb;

create policy "Members can create emergency actions for approval"
on public.emergency_actions for insert
with check (
  public.current_user_is_org_member(organization_id)
  and status = 'pending_approval'::public.emergency_action_status
);

create policy "Owners and admins can update emergency actions"
on public.emergency_actions for update
using (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]))
with check (
  public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  and status in (
    'draft',
    'pending_approval',
    'approved',
    'partially_approved',
    'rejected',
    'cancelled',
    'completed'
  )
);

alter table public.emergency_actions
drop constraint if exists emergency_actions_message_tone_check;

alter table public.emergency_actions
add constraint emergency_actions_message_tone_check
check (message_tone in ('professional', 'friendly', 'short', 'apologetic')) not valid;

alter table public.suggested_actions
add column if not exists emergency_action_id uuid references public.emergency_actions(id) on delete set null,
add column if not exists reschedule_proposal_id uuid;

create table if not exists public.reschedule_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  emergency_action_id uuid not null references public.emergency_actions(id) on delete cascade,
  status public.emergency_action_status not null default 'draft',
  target_date date not null,
  affected_events_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reschedule_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  emergency_action_id uuid not null references public.emergency_actions(id) on delete cascade,
  reschedule_batch_id uuid references public.reschedule_batches(id) on delete set null,
  calendar_event_id uuid not null references public.calendar_events_cache(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  original_starts_at timestamptz not null,
  original_ends_at timestamptz not null,
  proposed_starts_at timestamptz,
  proposed_ends_at timestamptz,
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  preferred_channel text not null default 'manual_review',
  message_body text not null,
  status public.emergency_action_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reschedule_proposals_preferred_channel_check
    check (preferred_channel in ('email', 'whatsapp', 'manual_review')),
  constraint reschedule_proposals_time_order check (
    proposed_starts_at is null
    or proposed_ends_at is null
    or proposed_ends_at > proposed_starts_at
  )
);

alter table public.suggested_actions
drop constraint if exists suggested_actions_reschedule_proposal_fk;

alter table public.suggested_actions
add constraint suggested_actions_reschedule_proposal_fk
foreign key (reschedule_proposal_id)
references public.reschedule_proposals(id)
on delete set null
not valid;

create index if not exists emergency_actions_org_status_target_idx
on public.emergency_actions(organization_id, status, target_date desc);

create index if not exists emergency_actions_org_type_target_idx
on public.emergency_actions(organization_id, action_type, target_date desc);

create index if not exists reschedule_batches_org_emergency_idx
on public.reschedule_batches(organization_id, emergency_action_id, status);

create index if not exists reschedule_batches_org_target_idx
on public.reschedule_batches(organization_id, target_date desc);

create index if not exists reschedule_proposals_org_emergency_idx
on public.reschedule_proposals(organization_id, emergency_action_id, status);

create index if not exists reschedule_proposals_batch_idx
on public.reschedule_proposals(reschedule_batch_id);

create index if not exists suggested_actions_emergency_idx
on public.suggested_actions(organization_id, emergency_action_id, status);

drop trigger if exists reschedule_batches_updated_at on public.reschedule_batches;
create trigger reschedule_batches_updated_at
before update on public.reschedule_batches
for each row execute function public.set_updated_at();

drop trigger if exists reschedule_proposals_updated_at on public.reschedule_proposals;
create trigger reschedule_proposals_updated_at
before update on public.reschedule_proposals
for each row execute function public.set_updated_at();

alter table public.reschedule_batches enable row level security;
alter table public.reschedule_proposals enable row level security;

drop policy if exists "Members can read reschedule batches" on public.reschedule_batches;
create policy "Members can read reschedule batches"
on public.reschedule_batches for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can create reschedule batches" on public.reschedule_batches;
create policy "Members can create reschedule batches"
on public.reschedule_batches for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can update reschedule batches" on public.reschedule_batches;
create policy "Members can update reschedule batches"
on public.reschedule_batches for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can read reschedule proposals" on public.reschedule_proposals;
create policy "Members can read reschedule proposals"
on public.reschedule_proposals for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can create reschedule proposals" on public.reschedule_proposals;
create policy "Members can create reschedule proposals"
on public.reschedule_proposals for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can update reschedule proposals" on public.reschedule_proposals;
create policy "Members can update reschedule proposals"
on public.reschedule_proposals for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));
