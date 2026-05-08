alter table public.notification_tokens
add column if not exists expo_push_token text,
add column if not exists status text not null default 'active';

update public.notification_tokens
set expo_push_token = token
where expo_push_token is null;

alter table public.notification_tokens
alter column expo_push_token set not null;

alter table public.notification_tokens
drop constraint if exists notification_tokens_status_check;

alter table public.notification_tokens
add constraint notification_tokens_status_check
check (status in ('active', 'disabled', 'revoked')) not valid;

create unique index if not exists notification_tokens_expo_push_token_unique_idx
on public.notification_tokens(expo_push_token);

create index if not exists notification_tokens_org_idx
on public.notification_tokens(organization_id);

create index if not exists notification_tokens_org_user_status_idx
on public.notification_tokens(organization_id, user_id, status);

create index if not exists notification_tokens_org_status_idx
on public.notification_tokens(organization_id, status);
