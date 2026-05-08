alter type public.account_provider add value if not exists 'whatsapp_business_cloud';
alter type public.suggested_action_type add value if not exists 'send_whatsapp_reply';
alter type public.suggested_action_type add value if not exists 'ask_whatsapp_more_info';

do $$
begin
  create type public.whatsapp_provider as enum ('whatsapp_business_cloud');
exception
  when duplicate_object then null;
end $$;

alter table public.incoming_messages
add column if not exists whatsapp_provider public.whatsapp_provider,
add column if not exists whatsapp_phone text,
add column if not exists whatsapp_message_type text;

alter table public.appointment_requests
add column if not exists source_channel public.communication_channel_type;

alter table public.connected_accounts
add column if not exists last_sync_error text;

create index if not exists incoming_messages_org_whatsapp_received_idx
on public.incoming_messages(organization_id, whatsapp_provider, received_at desc);

create index if not exists connected_accounts_org_provider_external_idx
on public.connected_accounts(organization_id, provider, provider_account_id);

create index if not exists suggested_actions_org_whatsapp_approval_idx
on public.suggested_actions(organization_id, action_type, status, created_at desc)
where action_type in ('send_whatsapp_reply', 'ask_whatsapp_more_info');

drop policy if exists "Members can insert incoming messages" on public.incoming_messages;
create policy "Members can insert incoming messages"
on public.incoming_messages for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can insert appointment requests" on public.appointment_requests;
create policy "Members can insert appointment requests"
on public.appointment_requests for insert
with check (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can insert suggested actions" on public.suggested_actions;
create policy "Members can insert suggested actions"
on public.suggested_actions for insert
with check (
  public.current_user_is_org_member(organization_id)
  and status = 'pending_approval'
  and requires_approval = true
);
