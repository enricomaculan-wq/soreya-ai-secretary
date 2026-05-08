alter type public.account_provider add value if not exists 'microsoft_calendar';
alter type public.suggested_action_type add value if not exists 'cancel_calendar_event';
alter type public.suggested_action_type add value if not exists 'propose_alternative_slots';

do $$
begin
  create type public.calendar_provider as enum ('google', 'microsoft');
exception
  when duplicate_object then null;
end $$;

alter table public.connected_accounts
add column if not exists last_sync_error text;

alter table public.calendar_events_cache
add column if not exists provider public.calendar_provider;

update public.calendar_events_cache events
set provider = case accounts.provider
  when 'microsoft_calendar' then 'microsoft'::public.calendar_provider
  else 'google'::public.calendar_provider
end
from public.connected_accounts accounts
where events.connected_account_id = accounts.id
  and events.provider is null;

create index if not exists calendar_events_cache_org_provider_time_idx
on public.calendar_events_cache(organization_id, provider, starts_at, ends_at);
