alter type public.communication_channel_type add value if not exists 'website_chat';

create table if not exists public.website_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_token text not null unique,
  visitor_name text,
  visitor_email text,
  page_url text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.website_chat_sessions(id) on delete cascade,
  direction public.message_direction not null,
  body_text text not null,
  author_name text,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists website_chat_sessions_org_updated_idx
on public.website_chat_sessions(organization_id, updated_at desc);

create index if not exists website_chat_messages_session_created_idx
on public.website_chat_messages(session_id, created_at asc);

create index if not exists incoming_messages_org_website_chat_received_idx
on public.incoming_messages(organization_id, received_at desc)
where source_channel = 'website_chat';

alter table public.website_chat_sessions enable row level security;
alter table public.website_chat_messages enable row level security;

drop policy if exists "Members can read website chat sessions" on public.website_chat_sessions;
create policy "Members can read website chat sessions"
on public.website_chat_sessions for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can read website chat messages" on public.website_chat_messages;
create policy "Members can read website chat messages"
on public.website_chat_messages for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Members can insert website chat replies" on public.website_chat_messages;
create policy "Members can insert website chat replies"
on public.website_chat_messages for insert
with check (public.current_user_is_org_member(organization_id));
