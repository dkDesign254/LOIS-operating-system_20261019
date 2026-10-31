-- KB-025: business areas (modules), several businesses per workspace, sharing between them.
-- Applied live as kb_25a (tables, seed) plus functions through the SQL runner. Exported here as written.
create table if not exists public.lois_areas (
  code text primary key check (code ~ '^[a-z-]{2,30}$'), name text not null, grp text not null, summary text not null,
  jobs text[] not null default '{}', requires text[] not null default '{}', feeds text[] not null default '{}',
  status text not null check (status in ('live','beta','planned')), core boolean not null default false,
  odoo text, zoho text, sort int not null default 100
);
alter table public.lois_areas enable row level security;
create policy areas_sel on public.lois_areas for select to authenticated using (true);
create policy areas_sel_anon on public.lois_areas for select to anon using (true);
create table if not exists public.lois_businesses (
  business_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80), sector text, currency text not null default 'KES',
  created_by uuid, created_at timestamptz not null default now(), unique (tenant_id, name)
);
alter table public.lois_businesses enable row level security;
create policy biz_sel on public.lois_businesses for select to authenticated using (lois_private.is_member(tenant_id));
create table if not exists public.lois_business_areas (
  business_id uuid not null references public.lois_businesses(business_id) on delete cascade,
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  area_code text not null references public.lois_areas(code),
  state text not null check (state in ('on','wanted')), changed_by uuid, changed_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (business_id, area_code)
);
alter table public.lois_business_areas enable row level security;
create policy ba_sel on public.lois_business_areas for select to authenticated using (lois_private.is_member(tenant_id));
create table if not exists public.lois_business_shares (
  share_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  from_business uuid not null references public.lois_businesses(business_id) on delete cascade,
  to_business uuid not null references public.lois_businesses(business_id) on delete cascade,
  dataset text not null check (dataset in ('contacts','products','stock','ledger')),
  granted_by uuid, granted_at timestamptz not null default now(),
  unique (from_business, to_business, dataset), check (from_business <> to_business)
);
alter table public.lois_business_shares enable row level security;
create policy bs_sel on public.lois_business_shares for select to authenticated using (lois_private.is_member(tenant_id));
-- A row of data belongs to one business, or to none (null = shared across the workspace).
alter table public.erp_contacts add column if not exists business_id uuid references public.lois_businesses(business_id) on delete set null;
alter table public.erp_products add column if not exists business_id uuid references public.lois_businesses(business_id) on delete set null;
alter table public.erp_deals add column if not exists business_id uuid references public.lois_businesses(business_id) on delete set null;
alter table public.erp_docs add column if not exists business_id uuid references public.lois_businesses(business_id) on delete set null;
alter table public.erp_promissory_notes add column if not exists business_id uuid references public.lois_businesses(business_id) on delete set null;
alter table public.erp_stock_moves add column if not exists business_id uuid references public.lois_businesses(business_id) on delete set null;
alter table public.erp_journal add column if not exists business_id uuid references public.lois_businesses(business_id) on delete set null;
create index if not exists ba_tenant on public.lois_business_areas(tenant_id);
create index if not exists biz_tenant on public.lois_businesses(tenant_id);
create index if not exists bs_tenant on public.lois_business_shares(tenant_id);
insert into public.lois_areas(code,name,grp,summary,jobs,requires,feeds,status,core,odoo,zoho,sort) values
('knowledge','Knowledge and decisions','Core','Your approved knowledge, decision frameworks and the assistant.','{Strategy,Operations}','{}','{automation,analytics}','live',true,'Knowledge','Notebook / Learn',1),
('automation','Automation hub and sandbox','Core','Use cases that run through Make, n8n or Zapier, tested first on sample data.','{Operations,Marketing,Sales}','{}','{}','live',true,'Automation','Flow',2),
('analytics','Insights and analytics','Core','Plain-language reports on what people and runs are doing.','{Management}','{}','{}','live',true,'Dashboards','Analytics',3),
('crm','Contacts and CRM','Sales','Customers, suppliers, leads and the deals pipeline.','{Sales,Account management}','{}','{sales,invoicing,marketing,helpdesk}','live',false,'CRM','CRM / Bigin',10),
('sales','Quotes and orders','Sales','Prepare quotes, get them approved and turn them into orders.','{Sales}','{crm}','{invoicing,inventory}','live',false,'Sales','CRM quotes',11),
('invoicing','Invoicing','Finance','Numbered invoices with VAT, due dates, credit limits and a second-person approval.','{Finance,Accounts}','{crm}','{accounting,payments,inventory}','live',false,'Invoicing','Invoice',20),
('payments','Receipts and payments','Finance','Record bank, M-Pesa, cash and cheque payments and issue numbered receipts.','{Finance,Accounts}','{invoicing}','{accounting}','live',false,'Payments','Checkout',21),
('accounting','Accounting and ledger','Finance','Double-entry ledger, chart of accounts and trial balance fed by invoices and receipts.','{Finance,Accounts}','{invoicing}','{analytics}','live',false,'Accounting','Books',22),
('promissory','Promissory notes and credit','Finance','Drafted and signed notes for customers who buy on credit.','{Finance,Credit control}','{crm}','{accounting}','live',false,'Credit','Billing',23),
('expenses','Expenses','Finance','Capture and approve business spending.','{Finance}','{accounting}','{accounting}','planned',false,'Expenses','Expense',24),
('payroll','Payroll','Finance','Salaries, statutory deductions and payslips.','{Finance,HR}','{people}','{accounting}','planned',false,'Payroll','Payroll',25),
('inventory','Inventory','Supply chain','Products, stock levels and movements across a business.','{Warehouse,Operations}','{}','{invoicing,purchasing,manufacturing,pos}','live',false,'Inventory','Inventory',30),
('purchasing','Purchasing','Supply chain','Orders to suppliers and goods received.','{Procurement}','{inventory,crm}','{inventory,accounting}','planned',false,'Purchase','Inventory',31),
('manufacturing','Manufacturing','Supply chain','Bills of materials and production orders.','{Production}','{inventory,purchasing}','{inventory}','planned',false,'Manufacturing','Inventory',32),
('pos','Point of sale','Supply chain','Shop and counter sales that update stock and the ledger.','{Retail}','{inventory,payments}','{accounting,inventory}','planned',false,'Point of Sale','Commerce',33),
('people','People','People','Employee records, attendance and leave.','{HR}','{}','{payroll}','planned',false,'Employees','People',40),
('recruitment','Recruitment','People','Job posts, candidates and hiring steps.','{HR}','{people}','{people}','planned',false,'Recruitment','Recruit',41),
('marketing','Email and campaigns','Marketing','Email campaigns and follow-up sequences to your contacts.','{Marketing}','{crm}','{crm}','planned',false,'Email Marketing','Campaigns',50),
('social','Social media management','Marketing','Plan, draft, approve and schedule posts, then learn what worked.','{Marketing,Communications}','{automation}','{analytics,knowledge}','beta',false,'Social Marketing','Social',51),
('website','Website','Web and commerce','Pages, forms and a site that feeds your CRM.','{Marketing}','{}','{crm}','planned',false,'Website','Sites / Forms',60),
('ecommerce','Online shop','Web and commerce','Sell products online with stock and payments connected.','{Sales,Retail}','{website,inventory,payments}','{inventory,accounting}','planned',false,'eCommerce','Commerce',61),
('projects','Projects','Services','Tasks, timelines and client work.','{Delivery,Consulting}','{}','{invoicing}','planned',false,'Project','Projects',70),
('helpdesk','Helpdesk','Services','Customer support requests and answers drawn from your knowledge.','{Support}','{crm}','{knowledge}','planned',false,'Helpdesk','Desk',71),
('bookings','Bookings','Services','Appointments and reservations.','{Services}','{crm}','{invoicing}','planned',false,'Appointments','Bookings',72)
on conflict (code) do nothing;

create or replace function public.lois_area_set(p_business uuid, p_area text, p_on boolean, p_with_needs boolean) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); b public.lois_businesses; a public.lois_areas; r text; missing text[] := '{}'; blockers text[]; st text; unbuilt text;
begin
  select * into b from public.lois_businesses where business_id = p_business;
  if b.business_id is null or not lois_private.has_role(b.tenant_id, array['owner','admin']) then raise exception 'Only an owner or admin can change areas' using errcode = '42501'; end if;
  select * into a from public.lois_areas where code = p_area;
  if a.code is null then raise exception 'Unknown area'; end if;
  if a.core then raise exception 'This area is always on'; end if;
  if p_on then
    st := case when a.status = 'planned' then 'wanted' else 'on' end;
    if st = 'on' then
      foreach r in array a.requires loop
        if not exists (select 1 from public.lois_business_areas x where x.business_id = p_business and x.area_code = r and x.state = 'on' and x.active) then missing := missing || r; end if;
      end loop;
      if coalesce(array_length(missing,1),0) > 0 then
        if not p_with_needs then raise exception 'Needs % first (or switch them on together)', array_to_string(missing, ', '); end if;
        select string_agg(c.code, ', ') into unbuilt from public.lois_areas c where c.code = any(missing) and c.status = 'planned';
        if unbuilt is not null then raise exception 'A needed area is not built yet: %', unbuilt; end if;
        insert into public.lois_business_areas(business_id, tenant_id, area_code, state, changed_by, active)
          select p_business, b.tenant_id, c.code, 'on', uid, true from public.lois_areas c where c.code = any(missing)
          on conflict (business_id, area_code) do update set state = 'on', active = true, changed_by = uid, changed_at = now();
      end if;
    end if;
    insert into public.lois_business_areas(business_id, tenant_id, area_code, state, changed_by, active) values (p_business, b.tenant_id, p_area, st, uid, true)
      on conflict (business_id, area_code) do update set state = st, active = true, changed_by = uid, changed_at = now();
  else
    select array_agg(x.area_code) into blockers from public.lois_business_areas x join public.lois_areas y on y.code = x.area_code where x.business_id = p_business and x.state = 'on' and x.active and p_area = any(y.requires);
    if blockers is not null then raise exception 'Still needed by %', array_to_string(blockers, ', '); end if;
    update public.lois_business_areas set active = false, changed_by = uid, changed_at = now() where business_id = p_business and area_code = p_area;
    st := 'off';
  end if;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (b.tenant_id, uid, (select auth.jwt() ->> 'email'), 'area.' || st, jsonb_build_object('business', p_business, 'area', p_area));
  return st;
end $$;

create or replace function public.lois_share_set(p_from uuid, p_to uuid, p_dataset text, p_on boolean) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); f public.lois_businesses; t public.lois_businesses;
begin
  select * into f from public.lois_businesses where business_id = p_from; select * into t from public.lois_businesses where business_id = p_to;
  if f.business_id is null or t.business_id is null or f.tenant_id <> t.tenant_id or not lois_private.has_role(f.tenant_id, array['owner','admin']) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_on then insert into public.lois_business_shares(tenant_id, from_business, to_business, dataset, granted_by) values (f.tenant_id, p_from, p_to, p_dataset, uid) on conflict do nothing;
  else delete from public.lois_business_shares where from_business = p_from and to_business = p_to and dataset = p_dataset; end if;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (f.tenant_id, uid, (select auth.jwt() ->> 'email'), case when p_on then 'share.on' else 'share.off' end, jsonb_build_object('from', p_from, 'to', p_to, 'dataset', p_dataset));
end $$;
revoke all on function public.lois_area_set(uuid,text,boolean,boolean), public.lois_share_set(uuid,uuid,text,boolean) from public, anon;
grant execute on function public.lois_area_set(uuid,text,boolean,boolean), public.lois_share_set(uuid,uuid,text,boolean) to authenticated;
-- lois_business_save is defined in kb_26 (it also assigns the creator).
-- Every workspace gets one business named after it, with the core areas on.
insert into public.lois_businesses(tenant_id, name) select t.tenant_id, left(t.name, 80) from public.lois_tenants t where not exists (select 1 from public.lois_businesses b where b.tenant_id = t.tenant_id);
insert into public.lois_business_areas(business_id, tenant_id, area_code, state) select b.business_id, b.tenant_id, a.code, 'on' from public.lois_businesses b cross join public.lois_areas a where a.core on conflict do nothing;
