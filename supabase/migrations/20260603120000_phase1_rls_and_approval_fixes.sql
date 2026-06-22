-- Phase 1: calendar cache writes for sync, tighten suggested_actions updates.

drop policy if exists "Owners and admins can manage calendar cache" on public.calendar_events_cache;
create policy "Owners and admins can manage calendar cache"
on public.calendar_events_cache for all
using (
  public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
)
with check (
  public.current_user_has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
);

drop policy if exists "Members can update suggested approval state" on public.suggested_actions;
create policy "Members can update suggested approval state"
on public.suggested_actions for update
using (public.current_user_is_org_member(organization_id))
with check (
  public.current_user_is_org_member(organization_id)
  and requires_approval = true
  and status in (
    'pending_approval',
    'edited',
    'approved',
    'rejected',
    'ignored',
    'cancelled',
    'expired'
  )
);
