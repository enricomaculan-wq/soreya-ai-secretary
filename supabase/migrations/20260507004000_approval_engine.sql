alter type public.approval_state add value if not exists 'edited';
alter type public.approval_state add value if not exists 'ignored';
alter type public.approval_log_event add value if not exists 'edited';
alter type public.approval_log_event add value if not exists 'ignored';

drop policy if exists "Members can update suggested approval state" on public.suggested_actions;
create policy "Members can update suggested approval state"
on public.suggested_actions for update
using (public.current_user_is_org_member(organization_id))
with check (
  public.current_user_is_org_member(organization_id)
  and requires_approval = true
);

drop policy if exists "Members can create audit logs" on public.audit_logs;
create policy "Members can create audit logs"
on public.audit_logs for insert
with check (
  organization_id is not null
  and public.current_user_is_org_member(organization_id)
);

create index if not exists suggested_actions_org_action_status_idx
on public.suggested_actions(organization_id, action_type, status, created_at desc);
