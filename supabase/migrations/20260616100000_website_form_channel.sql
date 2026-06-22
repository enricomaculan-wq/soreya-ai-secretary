alter type public.communication_channel_type add value if not exists 'website_form';
alter type public.account_provider add value if not exists 'website_form';

alter table public.incoming_messages
add column if not exists source_channel public.communication_channel_type;

create index if not exists incoming_messages_org_website_form_received_idx
on public.incoming_messages(organization_id, received_at desc)
where source_channel = 'website_form';
