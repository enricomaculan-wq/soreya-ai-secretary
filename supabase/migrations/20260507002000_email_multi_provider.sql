alter type public.account_provider add value if not exists 'microsoft_mail';
alter type public.suggested_action_type add value if not exists 'send_email_reply';
alter type public.suggested_action_type add value if not exists 'create_email_draft';
alter type public.suggested_action_type add value if not exists 'ask_email_more_info';

do $$
begin
  create type public.email_provider as enum ('gmail', 'microsoft');
exception
  when duplicate_object then null;
end $$;

alter table public.incoming_messages
add column if not exists email_provider public.email_provider,
add column if not exists from_email text,
add column if not exists from_name text,
add column if not exists to_emails text[] not null default '{}',
add column if not exists cc_emails text[] not null default '{}',
add column if not exists snippet text,
add column if not exists has_attachments boolean not null default false;

alter table public.connected_accounts
add column if not exists last_sync_error text;

alter table public.incoming_messages
drop constraint if exists incoming_messages_organization_id_provider_message_id_key;

create unique index if not exists incoming_messages_org_account_provider_message_idx
on public.incoming_messages(organization_id, connected_account_id, provider_message_id)
where provider_message_id is not null;

create index if not exists incoming_messages_org_email_provider_received_idx
on public.incoming_messages(organization_id, email_provider, received_at desc);

-- Enum values above must commit before indexes referencing them (PostgreSQL 55P04).
-- See 20260507002001_email_suggested_action_indexes.sql
