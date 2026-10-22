-- KB-012: consent log, 3-question onboarding assessment, data-subject requests, and service-level privileges.
create or replace function lois_private.is_platform_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u join public.lois_admin_allowlist a on a.email = u.email where u.id = (select auth.uid()) and u.email_confirmed_at is not null)
$$;

create table if not exists public.lois_consents (
  consent_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('terms_privacy','onboarding_profile','product_updates')),
  policy_version text not null,
  granted boolean not null,
  source text,
  created_at timestamptz not null default now()
);
create table if not exists public.lois_onboarding (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  intent text not null check (intent in ('help_knowledge','decisions','automation','explore')),
  audience text not null check (audience in ('myself','my_team','my_clients')),
  org_type text not null check (org_type in ('startup','established','nonprofit','personal_brand','other')),
  source text not null default 'app' check (source in ('app','landing')),
  recommended_path text,
  policy_version text not null,
  completed_at timestamptz not null default now()
);
create table if not exists public.lois_data_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  user_email text,
  kind text not null check (kind in ('export','delete','correct','restrict')),
  status text not null default 'open' check (status in ('open','in_progress','done','declined')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table if not exists public.lois_permissions (permission text primary key, service text not null, description text not null);
create table if not exists public.lois_role_permissions (role text not null check (role in ('owner','admin','reviewer','member','viewer')), permission text not null references public.lois_permissions(permission) on delete cascade, primary key (role, permission));
create table if not exists public.lois_member_grants (
  grant_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null references public.lois_permissions(permission) on delete cascade,
  effect text not null check (effect in ('allow','deny')),
  expires_at timestamptz, reason text,
  granted_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, permission)
);
create index if not exists lois_consents_user on public.lois_consents (user_id, created_at desc);
create index if not exists lois_grants_tenant on public.lois_member_grants (tenant_id, user_id);
create index if not exists lois_dreq_status on public.lois_data_requests (status, created_at);

alter table public.lois_consents enable row level security;
alter table public.lois_onboarding enable row level security;
alter table public.lois_data_requests enable row level security;
alter table public.lois_permissions enable row level security;
alter table public.lois_role_permissions enable row level security;
alter table public.lois_member_grants enable row level security;
revoke all on public.lois_consents, public.lois_onboarding, public.lois_data_requests, public.lois_permissions, public.lois_role_permissions, public.lois_member_grants from anon, public;

create policy consents_sel on public.lois_consents for select to authenticated using (user_id = (select auth.uid()));
create policy consents_ins on public.lois_consents for insert to authenticated with check (user_id = (select auth.uid()));
grant select, insert on public.lois_consents to authenticated;
create policy onb_sel on public.lois_onboarding for select to authenticated using (user_id = (select auth.uid()));
create policy onb_ins on public.lois_onboarding for insert to authenticated with check (user_id = (select auth.uid()));
create policy onb_upd on public.lois_onboarding for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update (intent, audience, org_type, recommended_path) on public.lois_onboarding to authenticated;
create policy dreq_sel on public.lois_data_requests for select to authenticated using (user_id = (select auth.uid()) or lois_private.is_platform_admin());
create policy dreq_ins on public.lois_data_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'open');
create policy dreq_upd on public.lois_data_requests for update to authenticated using (lois_private.is_platform_admin()) with check (lois_private.is_platform_admin());
grant select, insert (kind, note, user_email) on public.lois_data_requests to authenticated;
grant update (status, resolved_at) on public.lois_data_requests to authenticated;
create policy perms_sel on public.lois_permissions for select to authenticated using (true);
create policy rperms_sel on public.lois_role_permissions for select to authenticated using (true);
grant select on public.lois_permissions, public.lois_role_permissions to authenticated;
create policy grants_sel on public.lois_member_grants for select to authenticated using (user_id = (select auth.uid()) or lois_private.has_role(tenant_id, array['owner','admin']));
grant select on public.lois_member_grants to authenticated;

insert into public.lois_permissions (permission, service, description) values
 ('knowledge.read','Knowledge base','Search and read documents and accepted entries'),
 ('knowledge.write','Knowledge base','Add and archive documents'),
 ('bank.submit','Knowledge bank','Propose entries for review'),
 ('bank.review','Knowledge bank','Accept or reject entries; answer help requests'),
 ('decisions.draft','Decisions','Create drafts and request evidence'),
 ('decisions.record','Decisions','Record a decision (approve, reject, ask for more)'),
 ('sandbox.run','Sandbox','Run dry runs and sandbox tools'),
 ('memory.write','Memory','Add memory entries'),
 ('api.manage','Integrations','Create and revoke API keys'),
 ('webhooks.manage','Integrations','Create and delete webhooks'),
 ('automations.manage','Automations','Edit the automations register and continuity items'),
 ('team.manage','Team','Invite people and manage privileges')
on conflict do nothing;
insert into public.lois_role_permissions (role, permission)
select r, p.permission from public.lois_permissions p cross join (values ('owner'),('admin')) v(r)
on conflict do nothing;
insert into public.lois_role_permissions (role, permission) values
 ('reviewer','knowledge.read'),('reviewer','knowledge.write'),('reviewer','bank.submit'),('reviewer','bank.review'),('reviewer','decisions.draft'),('reviewer','decisions.record'),('reviewer','sandbox.run'),('reviewer','memory.write'),
 ('member','knowledge.read'),('member','knowledge.write'),('member','bank.submit'),('member','decisions.draft'),('member','sandbox.run'),('member','memory.write'),
 ('viewer','knowledge.read'),('viewer','sandbox.run')
on conflict do nothing;

-- Effective permission: an explicit deny wins, an unexpired allow adds, otherwise the role default. Non-members have none.
create or replace function lois_private.has_perm(t uuid, perm text) returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when not exists (select 1 from public.lois_memberships m where m.tenant_id = t and m.user_id = (select auth.uid())) then false
    else coalesce(
      (select g.effect = 'allow' from public.lois_member_grants g where g.tenant_id = t and g.user_id = (select auth.uid()) and g.permission = perm and (g.expires_at is null or g.expires_at > now())),
      exists (select 1 from public.lois_memberships m join public.lois_role_permissions rp on rp.role = m.role where m.tenant_id = t and m.user_id = (select auth.uid()) and rp.permission = perm))
  end
$$;

create or replace function lois_private.my_permissions(p_tenant uuid) returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.permission order by p.permission), '{}') from public.lois_permissions p where lois_private.has_perm(p_tenant, p.permission)
$$;

create or replace function lois_private.set_grant(p_tenant uuid, p_user uuid, p_perm text, p_effect text, p_expires timestamptz, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare target_role text;
begin
  if not lois_private.has_perm(p_tenant, 'team.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  select role into target_role from public.lois_memberships where tenant_id = p_tenant and user_id = p_user;
  if target_role is null then raise exception 'that person is not a member of this workspace' using errcode = '22023'; end if;
  if target_role = 'owner' then raise exception 'an owner''s privileges cannot be changed here' using errcode = '22023'; end if;
  if p_user = (select auth.uid()) then raise exception 'you cannot change your own privileges' using errcode = '22023'; end if;
  if p_effect = 'clear' then
    delete from public.lois_member_grants where tenant_id = p_tenant and user_id = p_user and permission = p_perm;
  else
    if p_effect not in ('allow','deny') then raise exception 'unknown effect' using errcode = '22023'; end if;
    insert into public.lois_member_grants (tenant_id, user_id, permission, effect, expires_at, reason) values (p_tenant, p_user, p_perm, p_effect, p_expires, left(p_reason, 300))
    on conflict (tenant_id, user_id, permission) do update set effect = excluded.effect, expires_at = excluded.expires_at, reason = excluded.reason, granted_by = (select auth.uid()), created_at = now();
  end if;
  insert into public.lois_audit (tenant_id, actor, action, target, note) values (p_tenant, (select auth.uid()), 'Privilege ' || p_effect, p_perm, 'user ' || p_user::text || coalesce(' until ' || p_expires::text, '') || coalesce('. ' || left(p_reason, 160), ''));
end $$;

create or replace function lois_private.members_directory(p_tenant uuid) returns table (user_id uuid, email text, role text) language plpgsql stable security definer set search_path = '' as $$
begin
  if not lois_private.has_role(p_tenant, array['owner','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select m.user_id, u.email::text, m.role from public.lois_memberships m join auth.users u on u.id = m.user_id where m.tenant_id = p_tenant order by m.created_at;
end $$;

create or replace function lois_private.onboarding_summary() returns table (intent text, audience text, org_type text, source text, n bigint) language plpgsql stable security definer set search_path = '' as $$
begin
  if not lois_private.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select o.intent, o.audience, o.org_type, o.source, count(*) from public.lois_onboarding o group by 1,2,3,4 order by 5 desc;
end $$;

create or replace function public.lois_my_permissions(p_tenant uuid) returns text[] language sql stable set search_path = '' as $$ select lois_private.my_permissions(p_tenant) $$;
create or replace function public.lois_set_grant(p_tenant uuid, p_user uuid, p_perm text, p_effect text, p_expires timestamptz default null, p_reason text default null) returns void language sql set search_path = '' as $$ select lois_private.set_grant(p_tenant, p_user, p_perm, p_effect, p_expires, p_reason) $$;
create or replace function public.lois_members_directory(p_tenant uuid) returns table (user_id uuid, email text, role text) language sql stable set search_path = '' as $$ select * from lois_private.members_directory(p_tenant) $$;
create or replace function public.lois_onboarding_summary() returns table (intent text, audience text, org_type text, source text, n bigint) language sql stable set search_path = '' as $$ select * from lois_private.onboarding_summary() $$;
revoke execute on function public.lois_my_permissions(uuid), public.lois_set_grant(uuid,uuid,text,text,timestamptz,text), public.lois_members_directory(uuid), public.lois_onboarding_summary() from public, anon;
grant execute on function public.lois_my_permissions(uuid), public.lois_set_grant(uuid,uuid,text,text,timestamptz,text), public.lois_members_directory(uuid), public.lois_onboarding_summary() to authenticated;

-- Recording a decision now follows the privilege model (owner/admin/reviewer by default; can be granted or denied per person).
create or replace function lois_private.record_decision(p_brief uuid, p_decision text, p_reason text, p_conditions text, p_review date, p_expected text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.lois_decision_briefs; v int; key text; newstatus text;
begin
  select * into b from public.lois_decision_briefs where brief_id = p_brief;
  if not found then raise exception 'request not found' using errcode = '22023'; end if;
  if not lois_private.has_perm(b.tenant_id, 'decisions.record') then raise exception 'you do not have the privilege to record a decision' using errcode = '42501'; end if;
  if p_decision not in ('approved','rejected','needs_info') then raise exception 'unknown decision' using errcode = '22023'; end if;
  if b.status = 'draft' then raise exception 'submit the draft for decision first' using errcode = '22023'; end if;
  if b.status in ('approved','rejected') then raise exception 'this decision is already recorded' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_reason,''))) < 8 then raise exception 'write your reason first (a sentence is enough)' using errcode = '22023'; end if;
  if p_decision = 'approved' and b.risk = 'high' and not b.evidence_present then raise exception 'high-risk requests need evidence before approval' using errcode = '22023'; end if;
  v := b.version + 1; key := b.brief_id::text || '-v' || v;
  insert into public.lois_decision_records (tenant_id, brief_id, version, decision, reason, conditions, review_date, expected, brief_snapshot, challenge_snapshot, correlation)
    values (b.tenant_id, b.brief_id, v, p_decision, left(btrim(p_reason),600), left(p_conditions,400), p_review, left(p_expected,400), left(b.brief_text,4000), b.challenge, key);
  newstatus := case p_decision when 'needs_info' then 'needs_info' else p_decision end;
  update public.lois_decision_briefs set status = newstatus, version = v, updated_at = now(), decided_at = case when p_decision in ('approved','rejected') then now() else decided_at end where brief_id = b.brief_id;
  insert into public.lois_audit (tenant_id, actor, action, target, note, correlation)
    values (b.tenant_id, auth.uid(), 'Decision ' || replace(p_decision,'_',' '), b.title, 'v' || v || '. Reason: ' || left(btrim(p_reason),160) || '. Not executed.', key);
  return jsonb_build_object('version', v, 'status', newstatus, 'executed', false, 'correlation', key);
end $$;
