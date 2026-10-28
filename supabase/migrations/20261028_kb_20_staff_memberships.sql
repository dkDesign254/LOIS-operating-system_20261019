-- KB-020: every allow-listed, confirmed staff email owns the internal workspaces, so the review queue is visible to all of them.
-- Safe to re-run. New staff added to lois_admin_allowlist get access by re-running this statement.
insert into public.lois_memberships (tenant_id, user_id, role)
select t.tenant_id, u.id, 'owner'
from public.lois_tenants t
join public.lois_admin_allowlist a on true
join auth.users u on lower(u.email) = lower(a.email) and u.email_confirmed_at is not null
where t.tenant_type in ('holding_company', 'business_arm')
on conflict (tenant_id, user_id) do nothing;
