alter table public.notification_tokens
add column if not exists device_type text not null default 'mobile',
add column if not exists smartwatch_platform text not null default 'unknown',
add column if not exists capabilities jsonb not null default '["push_notifications","actionable_notifications","daily_summary_glance","open_mobile_deeplink"]'::jsonb;

update public.notification_tokens
set device_type = case when platform = 'web' then 'web' else 'mobile' end
where device_type is null
or (device_type = 'mobile' and platform = 'web');

update public.notification_tokens
set capabilities = '["push_notifications","open_mobile_deeplink"]'::jsonb
where device_type = 'web'
and capabilities = '["push_notifications","actionable_notifications","daily_summary_glance","open_mobile_deeplink"]'::jsonb;

alter table public.notification_tokens
drop constraint if exists notification_tokens_device_type_check;

alter table public.notification_tokens
add constraint notification_tokens_device_type_check
check (device_type in ('web', 'mobile', 'smartwatch')) not valid;

alter table public.notification_tokens
drop constraint if exists notification_tokens_smartwatch_platform_check;

alter table public.notification_tokens
add constraint notification_tokens_smartwatch_platform_check
check (smartwatch_platform in ('apple_watch', 'wear_os', 'unknown')) not valid;

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_friendly_notifications_enabled boolean not null default true,
  allow_quick_approve_from_watch boolean not null default false,
  allow_quick_ignore_from_watch boolean not null default false,
  show_daily_summary_on_watch boolean not null default true,
  emergency_shortcuts_on_watch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;

create trigger notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can manage their notification preferences" on public.notification_preferences;

create policy "Users can manage their notification preferences"
on public.notification_preferences for all
using (user_id = auth.uid() and public.current_user_is_org_member(organization_id))
with check (user_id = auth.uid() and public.current_user_is_org_member(organization_id));

create index if not exists notification_tokens_organization_id_idx
on public.notification_tokens(organization_id);

create index if not exists notification_tokens_user_id_idx
on public.notification_tokens(user_id);

create index if not exists notification_tokens_device_type_idx
on public.notification_tokens(device_type);

create index if not exists notification_tokens_platform_idx
on public.notification_tokens(platform);

create index if not exists notification_tokens_smartwatch_platform_idx
on public.notification_tokens(smartwatch_platform);

create index if not exists notification_tokens_status_idx
on public.notification_tokens(status);

create index if not exists notification_tokens_capabilities_gin_idx
on public.notification_tokens using gin(capabilities);

create index if not exists notification_preferences_organization_id_idx
on public.notification_preferences(organization_id);

create index if not exists notification_preferences_user_id_idx
on public.notification_preferences(user_id);
