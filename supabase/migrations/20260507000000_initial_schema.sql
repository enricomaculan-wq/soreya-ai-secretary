create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'admin', 'member');
create type public.account_provider as enum ('gmail', 'google_calendar', 'whatsapp_business');
create type public.connected_account_status as enum ('active', 'reauth_required', 'disabled', 'error');
create type public.communication_channel_type as enum ('email', 'whatsapp', 'calendar');
create type public.communication_channel_status as enum ('active', 'paused', 'disconnected');
create type public.message_direction as enum ('incoming', 'outgoing');
create type public.message_status as enum ('received', 'classified', 'needs_review', 'archived');
create type public.appointment_request_status as enum (
  'needs_review',
  'pending_approval',
  'approved',
  'rejected',
  'scheduled',
  'cancelled',
  'conflict_detected'
);
create type public.suggested_action_type as enum (
  'send_email',
  'send_whatsapp',
  'create_calendar_event',
  'update_calendar_event',
  'delete_calendar_event',
  'request_more_information',
  'escalate_to_user',
  'daily_summary'
);
create type public.approval_state as enum (
  'pending_approval',
  'approved',
  'rejected',
  'executed',
  'cancelled',
  'expired',
  'failed'
);
create type public.approval_log_event as enum (
  'created',
  'approved',
  'rejected',
  'executed',
  'cancelled',
  'expired',
  'failed'
);
create type public.emergency_action_type as enum (
  'pause_automation',
  'disconnect_channel',
  'block_contact',
  'notify_owner',
  'lock_external_sends'
);
create type public.calendar_event_status as enum ('confirmed', 'tentative', 'cancelled');
create type public.audit_actor_type as enum ('user', 'ai', 'system', 'integration');
create type public.user_rule_scope as enum (
  'all_channels',
  'email',
  'whatsapp',
  'calendar',
  'contact',
  'organization'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  default_timezone text not null default 'Europe/Rome',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  invited_email text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  provider public.account_provider not null,
  provider_account_id text not null,
  display_name text,
  email text,
  status public.connected_account_status not null default 'active',
  scopes text[] not null default '{}',
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_account_id)
);

create table public.communication_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  type public.communication_channel_type not null,
  external_id text,
  name text not null,
  address text,
  status public.communication_channel_status not null default 'active',
  is_primary boolean not null default false,
  sync_cursor text,
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, type, external_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  company_name text,
  email text,
  phone text,
  whatsapp_id text,
  timezone text,
  notes text,
  ai_context jsonb not null default '{}'::jsonb,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_has_reachable_identity check (
    email is not null or phone is not null or whatsapp_id is not null
  )
);

create table public.incoming_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid references public.communication_channels(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  provider_message_id text,
  thread_id text,
  direction public.message_direction not null default 'incoming',
  status public.message_status not null default 'received',
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz not null,
  classified_at timestamptz,
  ai_classification jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_message_id)
);

create table public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incoming_message_id uuid references public.incoming_messages(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  status public.appointment_request_status not null default 'needs_review',
  title text,
  requested_start timestamptz,
  requested_end timestamptz,
  requested_timezone text,
  duration_minutes integer,
  location text,
  meeting_type text,
  confidence numeric(4, 3) not null default 0,
  conflict_detected boolean not null default false,
  conflict_reason text,
  alternatives jsonb not null default '[]'::jsonb,
  extracted_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_requests_duration_positive check (
    duration_minutes is null or duration_minutes > 0
  ),
  constraint appointment_requests_confidence_range check (
    confidence >= 0 and confidence <= 1
  ),
  constraint appointment_requests_time_order check (
    requested_start is null or requested_end is null or requested_end > requested_start
  )
);

create table public.suggested_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_request_id uuid references public.appointment_requests(id) on delete set null,
  incoming_message_id uuid references public.incoming_messages(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  action_type public.suggested_action_type not null,
  status public.approval_state not null default 'pending_approval',
  title text not null,
  rationale text,
  draft_payload jsonb not null default '{}'::jsonb,
  external_payload jsonb not null default '{}'::jsonb,
  risk_level text not null default 'normal',
  requires_approval boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  executed_at timestamptz,
  failed_reason text,
  expires_at timestamptz,
  created_by_ai boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suggested_actions_external_requires_approval check (
    requires_approval = true
  ),
  constraint suggested_actions_approval_data_pair check (
    (approved_by is null and approved_at is null)
    or (approved_by is not null and approved_at is not null)
  ),
  constraint suggested_actions_approval_required_for_execution check (
    status not in ('approved', 'executed')
    or (approved_by is not null and approved_at is not null)
  ),
  constraint suggested_actions_risk_level check (risk_level in ('low', 'normal', 'high', 'critical'))
);

create table public.emergency_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  action_type public.emergency_action_type not null,
  status public.approval_state not null default 'pending_approval',
  reason text not null,
  target_channel_id uuid references public.communication_channels(id) on delete set null,
  target_contact_id uuid references public.contacts(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  executed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_actions_approval_data_pair check (
    (approved_by is null and approved_at is null)
    or (approved_by is not null and approved_at is not null)
  ),
  constraint emergency_actions_approval_required_for_execution check (
    status not in ('approved', 'executed')
    or (approved_by is not null and approved_at is not null)
  )
);

create table public.approval_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  suggested_action_id uuid references public.suggested_actions(id) on delete cascade,
  emergency_action_id uuid references public.emergency_actions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event public.approval_log_event not null,
  previous_status public.approval_state,
  next_status public.approval_state,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint approval_logs_one_target check (
    (suggested_action_id is not null and emergency_action_id is null)
    or (suggested_action_id is null and emergency_action_id is not null)
  )
);

create table public.daily_summary_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  timezone text not null default 'Europe/Rome',
  delivery_time time not null default '08:00',
  channels public.communication_channel_type[] not null default array['email', 'whatsapp', 'calendar']::public.communication_channel_type[],
  include_pending_approvals boolean not null default true,
  include_calendar_conflicts boolean not null default true,
  include_unanswered_messages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.calendar_events_cache (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  external_event_id text not null,
  calendar_id text not null,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text,
  status public.calendar_event_status not null default 'confirmed',
  attendees jsonb not null default '[]'::jsonb,
  is_all_day boolean not null default false,
  raw_event jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, connected_account_id, external_event_id),
  constraint calendar_events_cache_time_order check (ends_at > starts_at)
);

create table public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  token text not null,
  device_name text,
  app_version text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, token),
  constraint notification_tokens_platform check (platform in ('ios', 'android', 'web'))
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_type public.audit_actor_type not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  entity_table text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  scope public.user_rule_scope not null default 'all_channels',
  contact_id uuid references public.contacts(id) on delete cascade,
  title text not null,
  instruction text not null,
  priority integer not null default 100,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id);
create index connected_accounts_org_status_idx on public.connected_accounts(organization_id, status);
create index communication_channels_org_type_idx on public.communication_channels(organization_id, type);
create index contacts_org_email_idx on public.contacts(organization_id, lower(email));
create index contacts_org_whatsapp_idx on public.contacts(organization_id, whatsapp_id);
create index incoming_messages_org_received_idx on public.incoming_messages(organization_id, received_at desc);
create index incoming_messages_thread_idx on public.incoming_messages(organization_id, thread_id);
create index appointment_requests_org_status_idx on public.appointment_requests(organization_id, status);
create index suggested_actions_org_status_idx on public.suggested_actions(organization_id, status, created_at desc);
create index approval_logs_action_idx on public.approval_logs(suggested_action_id, created_at desc);
create index approval_logs_emergency_idx on public.approval_logs(emergency_action_id, created_at desc);
create index emergency_actions_org_status_idx on public.emergency_actions(organization_id, status, created_at desc);
create index calendar_events_cache_org_time_idx on public.calendar_events_cache(organization_id, starts_at, ends_at);
create index notification_tokens_user_idx on public.notification_tokens(user_id);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index user_rules_org_active_idx on public.user_rules(organization_id, is_active, priority);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members members
    where members.organization_id = target_org_id
      and members.user_id = auth.uid()
  );
$$;

create or replace function public.current_user_has_org_role(
  target_org_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members members
    where members.organization_id = target_org_id
      and members.user_id = auth.uid()
      and members.role = any(allowed_roles)
  );
$$;

create or replace function public.organization_has_no_members(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.organization_members members
    where members.organization_id = target_org_id
  );
$$;

create or replace function public.create_organization_for_current_user(
  organization_name text,
  organization_slug text,
  organization_timezone text default 'Europe/Rome'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(organization_name)) < 2 then
    raise exception 'Organization name is too short';
  end if;

  insert into public.organizations (name, slug, default_timezone)
  values (trim(organization_name), lower(trim(organization_slug)), coalesce(nullif(trim(organization_timezone), ''), 'Europe/Rome'))
  returning * into new_organization;

  insert into public.organization_members (organization_id, user_id, role, joined_at)
  values (new_organization.id, auth.uid(), 'owner', now());

  return new_organization;
end;
$$;

grant execute on function public.create_organization_for_current_user(text, text, text) to authenticated;

create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organization_members_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

create trigger connected_accounts_updated_at
before update on public.connected_accounts
for each row execute function public.set_updated_at();

create trigger communication_channels_updated_at
before update on public.communication_channels
for each row execute function public.set_updated_at();

create trigger contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger incoming_messages_updated_at
before update on public.incoming_messages
for each row execute function public.set_updated_at();

create trigger appointment_requests_updated_at
before update on public.appointment_requests
for each row execute function public.set_updated_at();

create trigger suggested_actions_updated_at
before update on public.suggested_actions
for each row execute function public.set_updated_at();

create trigger emergency_actions_updated_at
before update on public.emergency_actions
for each row execute function public.set_updated_at();

create trigger daily_summary_settings_updated_at
before update on public.daily_summary_settings
for each row execute function public.set_updated_at();

create trigger calendar_events_cache_updated_at
before update on public.calendar_events_cache
for each row execute function public.set_updated_at();

create trigger notification_tokens_updated_at
before update on public.notification_tokens
for each row execute function public.set_updated_at();

create trigger user_rules_updated_at
before update on public.user_rules
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.communication_channels enable row level security;
alter table public.contacts enable row level security;
alter table public.incoming_messages enable row level security;
alter table public.appointment_requests enable row level security;
alter table public.suggested_actions enable row level security;
alter table public.approval_logs enable row level security;
alter table public.daily_summary_settings enable row level security;
alter table public.emergency_actions enable row level security;
alter table public.calendar_events_cache enable row level security;
alter table public.notification_tokens enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_rules enable row level security;

create policy "Members can read organizations"
on public.organizations for select
using (public.current_user_is_org_member(id));

create policy "Authenticated users can create organizations"
on public.organizations for insert
with check (auth.uid() is not null);

create policy "Owners and admins can update organizations"
on public.organizations for update
using (public.current_user_has_org_role(id, array['owner', 'admin']::public.organization_role[]))
with check (public.current_user_has_org_role(id, array['owner', 'admin']::public.organization_role[]));

create policy "Members can read organization memberships"
on public.organization_members for select
using (public.current_user_is_org_member(organization_id));

create policy "Owners and admins can manage organization memberships"
on public.organization_members for all
using (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]))
with check (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

create policy "Authenticated users can create first owner membership"
on public.organization_members for insert
with check (
  auth.uid() = user_id
  and role = 'owner'
  and public.organization_has_no_members(organization_id)
);

create policy "Members can read connected accounts"
on public.connected_accounts for select
using (public.current_user_is_org_member(organization_id));

create policy "Owners and admins can manage connected accounts"
on public.connected_accounts for all
using (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]))
with check (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

create policy "Members can read communication channels"
on public.communication_channels for select
using (public.current_user_is_org_member(organization_id));

create policy "Owners and admins can manage communication channels"
on public.communication_channels for all
using (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]))
with check (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

create policy "Members can manage contacts"
on public.contacts for all
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));

create policy "Members can read incoming messages"
on public.incoming_messages for select
using (public.current_user_is_org_member(organization_id));

create policy "Members can update message review state"
on public.incoming_messages for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));

create policy "Members can read appointment requests"
on public.appointment_requests for select
using (public.current_user_is_org_member(organization_id));

create policy "Members can update appointment request review state"
on public.appointment_requests for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));

create policy "Members can read suggested actions"
on public.suggested_actions for select
using (public.current_user_is_org_member(organization_id));

create policy "Members can update suggested approval state"
on public.suggested_actions for update
using (public.current_user_is_org_member(organization_id))
with check (
  public.current_user_is_org_member(organization_id)
  and status in ('pending_approval', 'approved', 'rejected', 'cancelled', 'expired')
);

create policy "Members can read approval logs"
on public.approval_logs for select
using (public.current_user_is_org_member(organization_id));

create policy "Members can create approval logs"
on public.approval_logs for insert
with check (public.current_user_is_org_member(organization_id));

create policy "Users can manage their own summary settings"
on public.daily_summary_settings for all
using (user_id = auth.uid() and public.current_user_is_org_member(organization_id))
with check (user_id = auth.uid() and public.current_user_is_org_member(organization_id));

create policy "Members can read emergency actions"
on public.emergency_actions for select
using (public.current_user_is_org_member(organization_id));

create policy "Members can create emergency actions for approval"
on public.emergency_actions for insert
with check (
  public.current_user_is_org_member(organization_id)
  and status = 'pending_approval'
);

create policy "Owners and admins can update emergency actions"
on public.emergency_actions for update
using (public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]))
with check (
  public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  and status in ('pending_approval', 'approved', 'rejected', 'cancelled', 'expired')
);

create policy "Members can read calendar cache"
on public.calendar_events_cache for select
using (public.current_user_is_org_member(organization_id));

create policy "Users can manage their notification tokens"
on public.notification_tokens for all
using (user_id = auth.uid() and public.current_user_is_org_member(organization_id))
with check (user_id = auth.uid() and public.current_user_is_org_member(organization_id));

create policy "Members can read audit logs"
on public.audit_logs for select
using (organization_id is not null and public.current_user_is_org_member(organization_id));

create policy "Members can manage user rules"
on public.user_rules for all
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));
