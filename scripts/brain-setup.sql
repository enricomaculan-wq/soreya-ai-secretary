-- Run once in Supabase SQL Editor (project jywdubtgeuamopybkqti)
-- Migration: organization_brain + seed for first organization

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

-- Seed Brain settings on the first organization
with target_org as (
  select id
  from public.organizations
  order by created_at asc
  limit 1
)
update public.organizations o
set
  settings = coalesce(o.settings, '{}'::jsonb) || jsonb_build_object(
    'brain', jsonb_build_object(
      'reasoningMode', 'balanced',
      'defaultReplyTone', 'professional',
      'requireServiceBeforeSlots', false,
      'requireExplicitDate', true,
      'ownerStyleNotes', 'Saluta per nome, tono professionale ma caldo. Non promettere appuntamenti in giornata.'
    )
  ),
  updated_at = now()
from target_org t
where o.id = t.id;

-- Seed demo listino servizi (idempotent by slug)
insert into public.organization_services (
  organization_id,
  slug,
  name,
  duration_minutes,
  price_cents,
  currency,
  is_active,
  aliases,
  description,
  sort_order,
  updated_at
)
select
  o.id,
  s.slug,
  s.name,
  s.duration_minutes,
  s.price_cents,
  s.currency,
  true,
  s.aliases,
  null,
  s.sort_order,
  now()
from public.organizations o
cross join (
  values
    ('igiene', 'Igiene dentale', 45, 8000, 'EUR', array['pulizia denti', 'detartrasi', 'igiene']::text[], 10),
    ('visita', 'Visita di controllo', 30, 5000, 'EUR', array['controllo', 'visita']::text[], 20),
    ('preventivo', 'Preventivo impianto', 60, null::integer, 'EUR', array['preventivo', 'impianto']::text[], 30)
) as s(slug, name, duration_minutes, price_cents, currency, aliases, sort_order)
where o.id = (select id from public.organizations order by created_at asc limit 1)
on conflict (organization_id, slug) do nothing;
