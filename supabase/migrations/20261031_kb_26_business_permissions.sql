-- KB-026: who can work in which business. Owners/admins see every business; other members only those assigned.
-- Existing policies are left in place; RESTRICTIVE policies narrow them (the SQL runner here cannot drop policies).
create table if not exists public.lois_business_members (
  business_id uuid not null references public.lois_businesses(business_id) on delete cascade,
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  user_id uuid not null, added_by uuid, added_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists bm_tenant on public.lois_business_members(tenant_id);
create index if not exists bm_user on public.lois_business_members(user_id);
alter table public.lois_business_members enable row level security;
insert into public.lois_business_members(business_id, tenant_id, user_id)
  select b.business_id, b.tenant_id, m.user_id from public.lois_businesses b join public.lois_memberships m on m.tenant_id = b.tenant_id on conflict do nothing;

create or replace function lois_private.can_see_business(p_business uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lois_businesses b where b.business_id = p_business and (
      lois_private.has_role(b.tenant_id, array['owner','admin'])
      or exists (select 1 from public.lois_business_members m where m.business_id = b.business_id and m.user_id = (select auth.uid())))) $$;
create or replace function lois_private.biz_row_visible(p_business uuid, p_dataset text) returns boolean language sql stable security definer set search_path = '' as $$
  select p_business is null or lois_private.can_see_business(p_business)
    or (p_dataset is not null and exists (select 1 from public.lois_business_shares s where s.from_business = p_business and s.dataset = p_dataset and lois_private.can_see_business(s.to_business))) $$;
revoke all on function lois_private.can_see_business(uuid), lois_private.biz_row_visible(uuid,text) from public, anon;
grant execute on function lois_private.can_see_business(uuid), lois_private.biz_row_visible(uuid,text) to authenticated;
create policy bm_sel on public.lois_business_members for select to authenticated using (user_id = (select auth.uid()) or lois_private.has_role(tenant_id, array['owner','admin']));

create or replace function public.lois_business_member_set(p_business uuid, p_user uuid, p_on boolean) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); b public.lois_businesses;
begin
  select * into b from public.lois_businesses where business_id = p_business;
  if b.business_id is null or not lois_private.has_role(b.tenant_id, array['owner','admin']) then raise exception 'Only an owner or admin can assign people' using errcode = '42501'; end if;
  if p_on then
    if not exists (select 1 from public.lois_memberships where tenant_id = b.tenant_id and user_id = p_user) then raise exception 'That person is not in this workspace'; end if;
    insert into public.lois_business_members(business_id, tenant_id, user_id, added_by) values (p_business, b.tenant_id, p_user, uid) on conflict do nothing;
  else
    delete from public.lois_business_members where business_id = p_business and user_id = p_user;
  end if;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (b.tenant_id, uid, (select auth.jwt() ->> 'email'), case when p_on then 'business.member_added' else 'business.member_removed' end, jsonb_build_object('business', p_business, 'user', p_user));
end $$;
revoke all on function public.lois_business_member_set(uuid,uuid,boolean) from public, anon;
grant execute on function public.lois_business_member_set(uuid,uuid,boolean) to authenticated;

create or replace function public.lois_business_save(p_tenant uuid, p_name text, p_sector text, p_currency text) returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); bid uuid;
begin
  if not lois_private.has_role(p_tenant, array['owner','admin']) then raise exception 'Only an owner or admin can add a business' using errcode = '42501'; end if;
  if (select count(*) from public.lois_businesses where tenant_id = p_tenant) >= 10 then raise exception 'Ten businesses is the current limit for a workspace'; end if;
  insert into public.lois_businesses(tenant_id, name, sector, currency, created_by) values (p_tenant, trim(p_name), nullif(trim(p_sector),''), coalesce(nullif(upper(trim(p_currency)),''),'KES'), uid) returning business_id into bid;
  insert into public.lois_business_areas(business_id, tenant_id, area_code, state, changed_by) select bid, p_tenant, code, 'on', uid from public.lois_areas where core;
  insert into public.lois_business_members(business_id, tenant_id, user_id, added_by) values (bid, p_tenant, uid, uid) on conflict do nothing;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (p_tenant, uid, (select auth.jwt() ->> 'email'), 'business.created', jsonb_build_object('business', bid, 'name', p_name));
  return bid;
end $$;
revoke all on function public.lois_business_save(uuid,text,text,text) from public, anon;
grant execute on function public.lois_business_save(uuid,text,text,text) to authenticated;

do $$
declare r record;
begin
  for r in select * from (values
    ('erp_contacts','lois_private.biz_row_visible(business_id, ''contacts'')'),
    ('erp_products','lois_private.biz_row_visible(business_id, ''products'')'),
    ('erp_stock_moves','lois_private.biz_row_visible(business_id, ''stock'')'),
    ('erp_journal','lois_private.biz_row_visible(business_id, ''ledger'')'),
    ('erp_deals','lois_private.biz_row_visible(business_id, null)'),
    ('erp_docs','lois_private.biz_row_visible(business_id, null)'),
    ('erp_promissory_notes','lois_private.biz_row_visible(business_id, null)'),
    ('erp_doc_lines','exists (select 1 from public.erp_docs d where d.doc_id = erp_doc_lines.doc_id)'),
    ('erp_payments','exists (select 1 from public.erp_docs d where d.doc_id = erp_payments.doc_id)'),
    ('erp_journal_lines','exists (select 1 from public.erp_journal j where j.entry_id = erp_journal_lines.entry_id)'),
    ('lois_businesses','lois_private.can_see_business(business_id)'),
    ('lois_business_areas','lois_private.can_see_business(business_id)'),
    ('lois_business_shares','(lois_private.can_see_business(from_business) or lois_private.can_see_business(to_business))')
  ) v(t, expr) loop
    execute format('create policy %I on public.%I as restrictive for select to authenticated using (%s)', r.t || '_biz', r.t, r.expr);
  end loop;
  for r in select unnest(array['erp_contacts','erp_products','erp_deals','erp_promissory_notes','erp_docs']) t loop
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (business_id is not null and lois_private.can_see_business(business_id))', r.t || '_biz_ins', r.t);
    execute format('create policy %I on public.%I as restrictive for update to authenticated using (business_id is null or lois_private.can_see_business(business_id))', r.t || '_biz_upd', r.t);
  end loop;
end $$;
