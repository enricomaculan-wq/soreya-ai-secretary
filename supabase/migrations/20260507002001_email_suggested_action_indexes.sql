-- Run after 20260507002000_email_multi_provider.sql (separate transaction).

create index if not exists suggested_actions_org_email_approval_idx
on public.suggested_actions(organization_id, action_type, status, created_at desc)
where action_type in ('send_email_reply', 'create_email_draft', 'ask_email_more_info');
