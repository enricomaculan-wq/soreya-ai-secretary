alter type public.account_provider add value if not exists 'telegram';
alter type public.communication_channel_type add value if not exists 'telegram';
alter type public.suggested_action_type add value if not exists 'send_telegram_reply';
alter type public.suggested_action_type add value if not exists 'ask_telegram_more_info';

do $$
begin
  create type public.telegram_provider as enum ('telegram_bot');
exception
  when duplicate_object then null;
end $$;

alter table public.incoming_messages
add column if not exists telegram_provider public.telegram_provider,
add column if not exists telegram_chat_id text,
add column if not exists telegram_message_id text,
add column if not exists telegram_message_type text;

create index if not exists incoming_messages_org_telegram_received_idx
on public.incoming_messages(organization_id, telegram_provider, received_at desc);

create index if not exists connected_accounts_org_telegram_provider_idx
on public.connected_accounts(organization_id, provider)
where provider = 'telegram';

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
