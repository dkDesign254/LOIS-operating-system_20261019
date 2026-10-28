-- KB-017: day-to-day users start on the customer side. Internal access is requested in the app and granted by a signed-in staff member with a second factor.
create table if not exists public.lois_access_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text not null,
  kind text not null default 'internal' check (kind in ('internal')),
  requested_role text not null default 'viewer' check (requested_role in ('viewer','member','reviewer')),
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','denied','withdrawn')),
  granted_tenant uuid references public.lois_tenants(tenant_id) on delete set null,
  granted_role text,
  decided_by uuid, decided_at timestamptz, decision_note text check (decision_note is null or char_length(decision_note) <= 500),
  created_at timestamptz not null default now()
);
create unique index if not exists lois_access_one_pending on public.lois_access_requests (user_id, kind) where status = 'pending';
alter table public.lois_access_requests enable row level security;
revoke all on public.lois_access_requests from anon, public;
create policy ar_sel on public.lois_access_requests for select to authenticated using (user_id = (select auth.uid()) or lois_private.is_staff_mfa());
create policy ar_ins on public.lois_access_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending' and email = (select u.email from auth.users u where u.id = (select auth.uid())));
create policy ar_upd on public.lois_access_requests for update to authenticated using (user_id = (select auth.uid()) and status = 'pending') with check (user_id = (select auth.uid()) and status = 'withdrawn');
grant select, insert on public.lois_access_requests to authenticated;
grant update (status) on public.lois_access_requests to authenticated;

-- Only allow-listed staff, or someone with an approved request, may hold a membership in an internal workspace.
create or replace function lois_private.guard_internal_membership() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.lois_tenants t where t.tenant_id = new.tenant_id and t.tenant_type in ('holding_company','business_arm')) then
    if not exists (select 1 from auth.users u join public.lois_admin_allowlist a on lower(a.email) = lower(u.email) where u.id = new.user_id and u.email_confirmed_at is not null)
       and not exists (select 1 from public.lois_access_requests r where r.user_id = new.user_id and r.status = 'approved' and r.granted_tenant = new.tenant_id) then
      raise exception 'internal workspaces need an approved access request' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_internal_membership on public.lois_memberships;
create trigger guard_internal_membership before insert on public.lois_memberships for each row execute function lois_private.guard_internal_membership();

create or replace function lois_private.decide_access(p_id uuid, p_decision text, p_tenant uuid, p_role text, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare r public.lois_access_requests;
begin
  if not lois_private.is_staff_mfa() then raise exception 'staff with a second factor only' using errcode = '42501'; end if;
  if p_decision not in ('approved','denied') then raise exception 'bad decision'; end if;
  select * into r from public.lois_access_requests where request_id = p_id and status = 'pending' for update;
  if not found then raise exception 'request is not pending'; end if;
  if p_decision = 'approved' then
    if p_role not in ('viewer','member','reviewer') then raise exception 'role must be viewer, member or reviewer'; end if;
    if not exists (select 1 from public.lois_tenants t where t.tenant_id = p_tenant and t.tenant_type in ('holding_company','business_arm')) then raise exception 'choose an internal workspace'; end if;
    update public.lois_access_requests set status = 'approved', granted_tenant = p_tenant, granted_role = p_role, decided_by = (select auth.uid()), decided_at = now(), decision_note = left(p_note, 500) where request_id = p_id;
    insert into public.lois_memberships (tenant_id, user_id, role) values (p_tenant, r.user_id, p_role) on conflict (tenant_id, user_id) do update set role = excluded.role;
  else
    update public.lois_access_requests set status = 'denied', decided_by = (select auth.uid()), decided_at = now(), decision_note = left(p_note, 500) where request_id = p_id;
  end if;
end $$;
revoke all on function lois_private.decide_access(uuid, text, uuid, text, text) from public, anon;
grant execute on function lois_private.decide_access(uuid, text, uuid, text, text) to authenticated;
create or replace function public.lois_decide_access(p_id uuid, p_decision text, p_tenant uuid default null, p_role text default 'viewer', p_note text default null) returns void language sql set search_path = '' as $$ select lois_private.decide_access(p_id, p_decision, p_tenant, p_role, p_note) $$;
revoke all on function public.lois_decide_access(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.lois_decide_access(uuid, text, uuid, text, text) to authenticated;
