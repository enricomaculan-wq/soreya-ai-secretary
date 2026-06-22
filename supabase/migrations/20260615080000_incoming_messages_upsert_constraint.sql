-- PostgREST upsert requires a non-partial unique constraint for onConflict inference.
drop index if exists public.incoming_messages_org_account_provider_message_idx;

alter table public.incoming_messages
drop constraint if exists incoming_messages_org_account_provider_message_key;

alter table public.incoming_messages
add constraint incoming_messages_org_account_provider_message_key
unique (organization_id, connected_account_id, provider_message_id);
