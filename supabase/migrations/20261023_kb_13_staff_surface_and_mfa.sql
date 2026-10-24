-- KB-013: staff (internal) surface gated by allow-list + second factor; staff-only workspaces cannot invite customers.
create or replace function lois_private.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select lois_private.is_platform_admin()
$$;
create or replace function lois_private.is_staff_mfa() returns boolean language sql stable security definer set search_path = '' as $$
  select lois_private.is_platform_admin() and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
$$;

alter policy dreq_sel on public.lois_data_requests using (user_id = (select auth.uid()) or lois_private.is_staff_mfa());
alter policy dreq_upd on public.lois_data_requests using (lois_private.is_staff_mfa()) with check (lois_private.is_staff_mfa());

create or replace function lois_private.onboarding_summary() returns table (intent text, audience text, org_type text, source text, n bigint) language plpgsql stable security definer set search_path = '' as $$
begin
  if not lois_private.is_staff_mfa() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select o.intent, o.audience, o.org_type, o.source, count(*) from public.lois_onboarding o group by 1,2,3,4 order by 5 desc;
end $$;

create or replace function lois_private.staff_overview() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not lois_private.is_staff_mfa() then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'workspaces', (select count(*) from public.lois_tenants),
    'internal_workspaces', (select count(*) from public.lois_tenants where tenant_type in ('holding_company','business_arm')),
    'open_data_requests', (select count(*) from public.lois_data_requests where status in ('open','in_progress')),
    'staff', (select coalesce(jsonb_agg(email order by email), '[]'::jsonb) from public.lois_admin_allowlist));
end $$;

create or replace function lois_private.guard_internal_invites() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.lois_tenants t where t.tenant_id = new.tenant_id and t.tenant_type in ('holding_company','business_arm'))
     and not exists (select 1 from public.lois_admin_allowlist a where a.email = new.email) then
    raise exception 'staff-only workspace: only allow-listed staff can be invited' using errcode = '42501';
  end if;
  return new;
end $$;
create or replace trigger guard_internal_invites before insert or update on public.lois_invitations for each row execute function lois_private.guard_internal_invites();

create or replace function public.lois_is_staff() returns boolean language sql stable set search_path = '' as $$ select lois_private.is_staff() $$;
create or replace function public.lois_staff_overview() returns jsonb language sql stable set search_path = '' as $$ select lois_private.staff_overview() $$;
revoke execute on function public.lois_is_staff(), public.lois_staff_overview() from public, anon;
grant execute on function public.lois_is_staff(), public.lois_staff_overview() to authenticated;
