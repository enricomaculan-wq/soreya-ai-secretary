do $$
begin
  create type public.daily_summary_status as enum ('generated', 'viewed', 'dismissed', 'failed');
exception
  when duplicate_object then null;
end $$;

alter table public.daily_summary_settings
add column if not exists include_calendar boolean not null default true,
add column if not exists include_free_slots boolean not null default true;

create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  summary_date date not null,
  timezone text not null default 'Europe/Rome',
  status public.daily_summary_status not null default 'generated',
  title text not null,
  headline text not null,
  total_appointments integer not null default 0,
  first_appointment_at timestamptz,
  last_appointment_at timestamptz,
  pending_approvals_count integer not null default 0,
  conflicts_count integer not null default 0,
  unhandled_messages_count integer not null default 0,
  free_slots_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, summary_date)
);

create index if not exists daily_summaries_org_date_idx
on public.daily_summaries(organization_id, summary_date desc);

drop trigger if exists daily_summaries_updated_at on public.daily_summaries;
create trigger daily_summaries_updated_at
before update on public.daily_summaries
for each row execute function public.set_updated_at();

alter table public.daily_summaries enable row level security;

drop policy if exists "Members can read daily summaries" on public.daily_summaries;
create policy "Members can read daily summaries"
on public.daily_summaries for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can create daily summaries" on public.daily_summaries;
create policy "Members can create daily summaries"
on public.daily_summaries for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can update daily summaries" on public.daily_summaries;
create policy "Members can update daily summaries"
on public.daily_summaries for update
using (public.current_user_is_org_member(organization_id))
with check (public.current_user_is_org_member(organization_id));
