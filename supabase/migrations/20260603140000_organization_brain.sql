create table if not exists public.organization_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 480),
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'EUR',
  is_active boolean not null default true,
  aliases text[] not null default '{}',
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_services_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  unique (organization_id, slug)
);

create index if not exists organization_services_org_active_sort_idx
on public.organization_services(organization_id, is_active, sort_order, name);

alter table public.appointment_requests
add column if not exists service_id uuid references public.organization_services(id) on delete set null;

create or replace function public.current_user_is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

alter table public.organization_services enable row level security;

drop policy if exists "Members can read organization services" on public.organization_services;
create policy "Members can read organization services"
on public.organization_services for select
using (public.current_user_is_org_member(organization_id));

drop policy if exists "Admins can manage organization services" on public.organization_services;
create policy "Admins can manage organization services"
on public.organization_services for all
using (public.current_user_is_org_admin(organization_id))
with check (public.current_user_is_org_admin(organization_id));
