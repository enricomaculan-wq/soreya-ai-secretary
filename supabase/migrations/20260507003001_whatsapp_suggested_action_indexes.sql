-- Run after 20260507003000_whatsapp_business_cloud.sql (separate transaction).

create index if not exists suggested_actions_org_whatsapp_approval_idx
on public.suggested_actions(organization_id, action_type, status, created_at desc)
where action_type in ('send_whatsapp_reply', 'ask_whatsapp_more_info');
