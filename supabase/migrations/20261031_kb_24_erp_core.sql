-- KB-024: native ERP/CRM core (lite): contacts, products, deals, quotes, invoices, receipts, promissory notes, stock, ledger.
-- Money is stored in minor units (cents). All tables are per workspace (tenant) and protected by RLS.
create table if not exists public.erp_contacts (
  contact_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  kind text not null default 'customer' check (kind in ('customer','supplier','lead','both')),
  name text not null check (char_length(name) between 2 and 160),
  email text, phone text, kra_pin text, address text,
  credit_limit bigint not null default 0 check (credit_limit >= 0),
  payment_terms_days int not null default 14 check (payment_terms_days between 0 and 365),
  notes text, created_by uuid, created_at timestamptz not null default now()
);
create table if not exists public.erp_products (
  product_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 60), name text not null,
  unit text not null default 'unit', price bigint not null default 0 check (price >= 0), cost bigint not null default 0 check (cost >= 0),
  tax_rate_bp int not null default 1600 check (tax_rate_bp between 0 and 10000),
  tracks_stock boolean not null default true, active boolean not null default true,
  created_at timestamptz not null default now(), unique (tenant_id, sku)
);
create table if not exists public.erp_deals (
  deal_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  contact_id uuid references public.erp_contacts(contact_id) on delete set null,
  title text not null, stage text not null default 'new' check (stage in ('new','qualified','proposal','negotiation','won','lost')),
  value bigint not null default 0 check (value >= 0), expected_close date, owner_id uuid, lost_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.erp_sequences (
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  kind text not null, year int not null, last_no int not null default 0, primary key (tenant_id, kind, year)
);
create table if not exists public.erp_docs (
  doc_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  kind text not null check (kind in ('quote','invoice','credit_note')),
  contact_id uuid not null references public.erp_contacts(contact_id),
  deal_id uuid references public.erp_deals(deal_id) on delete set null,
  number text, status text not null default 'draft' check (status in ('draft','awaiting_approval','issued','partly_paid','paid','void','accepted','declined')),
  currency text not null default 'KES', issue_date date, due_date date,
  subtotal bigint not null default 0, tax bigint not null default 0, total bigint not null default 0, paid bigint not null default 0,
  notes text, created_by uuid, approved_by uuid, created_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create table if not exists public.erp_doc_lines (
  line_id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.erp_docs(doc_id) on delete cascade,
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  product_id uuid references public.erp_products(product_id), description text not null,
  qty numeric(14,3) not null check (qty > 0), unit_price bigint not null check (unit_price >= 0), tax_rate_bp int not null default 1600
);
create table if not exists public.erp_payments (
  payment_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  doc_id uuid not null references public.erp_docs(doc_id), receipt_no text not null,
  amount bigint not null check (amount > 0), method text not null default 'bank' check (method in ('bank','mpesa','cash','cheque','card','other')),
  reference text, paid_on date not null default current_date, recorded_by uuid, created_at timestamptz not null default now(),
  unique (tenant_id, receipt_no)
);
create table if not exists public.erp_promissory_notes (
  note_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  contact_id uuid not null references public.erp_contacts(contact_id), doc_id uuid references public.erp_docs(doc_id),
  number text not null, principal bigint not null check (principal > 0), currency text not null default 'KES',
  interest_bp int not null default 0 check (interest_bp between 0 and 10000), issued_on date not null default current_date, due_on date not null,
  status text not null default 'draft' check (status in ('draft','signed','settled','defaulted','void')),
  signed_by_name text, signed_on date, terms text, created_by uuid, created_at timestamptz not null default now(),
  unique (tenant_id, number), check (due_on >= issued_on)
);
create table if not exists public.erp_stock_moves (
  move_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  product_id uuid not null references public.erp_products(product_id), qty numeric(14,3) not null check (qty <> 0),
  reason text not null check (reason in ('purchase','sale','adjustment','return','opening')), doc_id uuid references public.erp_docs(doc_id),
  note text, created_by uuid, created_at timestamptz not null default now()
);
create table if not exists public.erp_accounts (
  account_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  code text not null, name text not null, type text not null check (type in ('asset','liability','equity','income','expense')),
  unique (tenant_id, code)
);
create table if not exists public.erp_journal (
  entry_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  entry_date date not null default current_date, memo text not null, doc_id uuid references public.erp_docs(doc_id),
  created_by uuid, created_at timestamptz not null default now()
);
create table if not exists public.erp_journal_lines (
  line_id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.erp_journal(entry_id) on delete cascade,
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  account_id uuid not null references public.erp_accounts(account_id), debit bigint not null default 0 check (debit >= 0), credit bigint not null default 0 check (credit >= 0),
  check ((debit = 0) <> (credit = 0))
);
create index if not exists erp_docs_tenant on public.erp_docs(tenant_id, kind, status);
create index if not exists erp_lines_doc on public.erp_doc_lines(doc_id);
create index if not exists erp_jl_entry on public.erp_journal_lines(entry_id);
create index if not exists erp_stock_prod on public.erp_stock_moves(tenant_id, product_id);

do $$ declare t text; begin
  foreach t in array array['erp_contacts','erp_products','erp_deals','erp_docs','erp_doc_lines','erp_payments','erp_promissory_notes','erp_stock_moves','erp_accounts','erp_journal','erp_journal_lines','erp_sequences'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (lois_private.is_member(tenant_id))', t||'_sel', t);
  end loop;
  -- direct writes only for plain master data and drafts; money-moving tables are written through functions
  foreach t in array array['erp_contacts','erp_products','erp_deals','erp_promissory_notes'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (lois_private.has_role(tenant_id, array[''owner'',''admin'',''member'']))', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (lois_private.has_role(tenant_id, array[''owner'',''admin'',''member''])) with check (lois_private.has_role(tenant_id, array[''owner'',''admin'',''member'']))', t||'_upd', t);
  end loop;
end $$;
create policy erp_docs_ins on public.erp_docs for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','member']) and status = 'draft' and number is null);
create policy erp_docs_upd on public.erp_docs for update to authenticated using (lois_private.has_role(tenant_id, array['owner','admin','member']) and status = 'draft') with check (status = 'draft' and number is null);
create policy erp_lines_ins on public.erp_doc_lines for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','member']) and exists (select 1 from public.erp_docs d where d.doc_id = erp_doc_lines.doc_id and d.tenant_id = erp_doc_lines.tenant_id and d.status = 'draft'));
create policy erp_lines_del on public.erp_doc_lines for delete to authenticated using (lois_private.has_role(tenant_id, array['owner','admin','member']) and exists (select 1 from public.erp_docs d where d.doc_id = erp_doc_lines.doc_id and d.status = 'draft'));

create or replace function lois_private.erp_next_no(p_tenant uuid, p_kind text, p_prefix text) returns text language plpgsql security definer set search_path = '' as $$
declare y int := extract(year from now() at time zone 'Africa/Nairobi')::int; n int;
begin
  insert into public.erp_sequences(tenant_id, kind, year, last_no) values (p_tenant, p_kind, y, 1)
  on conflict (tenant_id, kind, year) do update set last_no = public.erp_sequences.last_no + 1 returning last_no into n;
  return p_prefix || '-' || y || '-' || lpad(n::text, 5, '0');
end $$;

create or replace function lois_private.erp_acct(p_tenant uuid, p_code text) returns uuid language sql security definer set search_path = '' as $$
  select account_id from public.erp_accounts where tenant_id = p_tenant and code = p_code $$;

create or replace function public.erp_seed_accounts(p_tenant uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not lois_private.has_role(p_tenant, array['owner','admin','member']) then raise exception 'Not allowed'; end if;
  insert into public.erp_accounts(tenant_id, code, name, type) values
   (p_tenant,'1000','Bank and cash','asset'),(p_tenant,'1100','Accounts receivable','asset'),(p_tenant,'1200','Inventory','asset'),
   (p_tenant,'2000','Accounts payable','liability'),(p_tenant,'2100','VAT payable','liability'),
   (p_tenant,'3000','Owner equity','equity'),(p_tenant,'4000','Sales','income'),(p_tenant,'5000','Cost of goods sold','expense'),(p_tenant,'6000','Operating expenses','expense')
  on conflict (tenant_id, code) do nothing;
end $$;

create or replace function lois_private.erp_recalc(p_doc uuid) returns void language sql security definer set search_path = '' as $$
  update public.erp_docs d set
    subtotal = coalesce(s.sub,0), tax = coalesce(s.tax,0), total = coalesce(s.sub,0) + coalesce(s.tax,0)
  from (select round(sum(qty * unit_price))::bigint sub, round(sum(qty * unit_price * tax_rate_bp / 10000.0))::bigint tax from public.erp_doc_lines where doc_id = p_doc) s
  where d.doc_id = p_doc and d.status in ('draft','awaiting_approval') $$;

create or replace function public.erp_issue_doc(p_doc uuid) returns text language plpgsql security definer set search_path = '' as $$
declare d public.erp_docs; no text; je uuid; ar uuid; rev uuid; vat uuid; c public.erp_contacts; owed bigint; isadmin boolean;
begin
  select * into d from public.erp_docs where doc_id = p_doc for update;
  if not found or not lois_private.has_role(d.tenant_id, array['owner','admin','member']) then raise exception 'Not allowed'; end if;
  if d.status not in ('draft','awaiting_approval') then raise exception 'Already issued'; end if;
  isadmin := lois_private.has_role(d.tenant_id, array['owner','admin']);
  perform lois_private.erp_recalc(p_doc);
  select * into d from public.erp_docs where doc_id = p_doc;
  if d.total <= 0 then raise exception 'Add at least one line'; end if;
  if d.kind = 'invoice' then
    if d.status = 'draft' and not isadmin then
      update public.erp_docs set status = 'awaiting_approval' where doc_id = p_doc; return 'awaiting_approval';
    end if;
    if not isadmin then raise exception 'An owner or admin must approve'; end if;
    if d.status = 'awaiting_approval' and d.created_by = (select auth.uid()) then raise exception 'A different owner or admin must approve'; end if;
    select * into c from public.erp_contacts where contact_id = d.contact_id;
    select coalesce(sum(total - paid),0) into owed from public.erp_docs where tenant_id = d.tenant_id and contact_id = d.contact_id and kind = 'invoice' and status in ('issued','partly_paid');
    if c.credit_limit > 0 and owed + d.total > c.credit_limit then raise exception 'Over the credit limit for this customer'; end if;
  end if;
  no := lois_private.erp_next_no(d.tenant_id, d.kind, case d.kind when 'quote' then 'QT' when 'invoice' then 'INV' else 'CN' end);
  update public.erp_docs set number = no, status = 'issued', issue_date = current_date,
    due_date = current_date + (select payment_terms_days from public.erp_contacts where contact_id = d.contact_id), approved_by = (select auth.uid())
   where doc_id = p_doc;
  if d.kind = 'invoice' then
    perform public.erp_seed_accounts(d.tenant_id);
    ar := lois_private.erp_acct(d.tenant_id,'1100'); rev := lois_private.erp_acct(d.tenant_id,'4000'); vat := lois_private.erp_acct(d.tenant_id,'2100');
    insert into public.erp_journal(tenant_id, memo, doc_id, created_by) values (d.tenant_id, 'Invoice '||no, p_doc, (select auth.uid())) returning entry_id into je;
    insert into public.erp_journal_lines(entry_id, tenant_id, account_id, debit, credit) values (je, d.tenant_id, ar, d.total, 0), (je, d.tenant_id, rev, 0, d.subtotal);
    if d.tax > 0 then insert into public.erp_journal_lines(entry_id, tenant_id, account_id, debit, credit) values (je, d.tenant_id, vat, 0, d.tax); end if;
    insert into public.erp_stock_moves(tenant_id, product_id, qty, reason, doc_id, created_by)
      select l.tenant_id, l.product_id, -l.qty, 'sale', p_doc, (select auth.uid()) from public.erp_doc_lines l join public.erp_products p on p.product_id = l.product_id and p.tracks_stock where l.doc_id = p_doc;
  end if;
  return no;
end $$;

create or replace function public.erp_record_payment(p_doc uuid, p_amount bigint, p_method text, p_reference text) returns text language plpgsql security definer set search_path = '' as $$
declare d public.erp_docs; rno text; je uuid; bank uuid; ar uuid;
begin
  select * into d from public.erp_docs where doc_id = p_doc for update;
  if not found or d.kind <> 'invoice' or not lois_private.has_role(d.tenant_id, array['owner','admin','member']) then raise exception 'Not allowed'; end if;
  if d.status not in ('issued','partly_paid') then raise exception 'Invoice is not open'; end if;
  if p_amount <= 0 or p_amount > d.total - d.paid then raise exception 'Amount must be between 1 and what is still owed'; end if;
  rno := lois_private.erp_next_no(d.tenant_id, 'receipt', 'RCT');
  insert into public.erp_payments(tenant_id, doc_id, receipt_no, amount, method, reference, recorded_by) values (d.tenant_id, p_doc, rno, p_amount, p_method, p_reference, (select auth.uid()));
  update public.erp_docs set paid = paid + p_amount, status = case when paid + p_amount >= total then 'paid' else 'partly_paid' end where doc_id = p_doc;
  bank := lois_private.erp_acct(d.tenant_id,'1000'); ar := lois_private.erp_acct(d.tenant_id,'1100');
  insert into public.erp_journal(tenant_id, memo, doc_id, created_by) values (d.tenant_id, 'Receipt '||rno, p_doc, (select auth.uid())) returning entry_id into je;
  insert into public.erp_journal_lines(entry_id, tenant_id, account_id, debit, credit) values (je, d.tenant_id, bank, p_amount, 0), (je, d.tenant_id, ar, 0, p_amount);
  return rno;
end $$;

create or replace function public.erp_stock_on_hand(p_tenant uuid) returns table(product_id uuid, sku text, name text, on_hand numeric) language sql security definer set search_path = '' as $$
  select p.product_id, p.sku, p.name, coalesce(sum(m.qty),0) from public.erp_products p left join public.erp_stock_moves m on m.product_id = p.product_id
  where p.tenant_id = p_tenant and lois_private.is_member(p_tenant) and p.tracks_stock group by p.product_id, p.sku, p.name $$;

create or replace function public.erp_trial_balance(p_tenant uuid) returns table(code text, name text, debit bigint, credit bigint) language sql security definer set search_path = '' as $$
  select a.code, a.name, coalesce(sum(l.debit),0)::bigint, coalesce(sum(l.credit),0)::bigint from public.erp_accounts a left join public.erp_journal_lines l on l.account_id = a.account_id
  where a.tenant_id = p_tenant and lois_private.is_member(p_tenant) group by a.code, a.name order by a.code $$;

-- Issued documents and journal rows are never edited in place.
revoke all on function public.erp_issue_doc(uuid), public.erp_record_payment(uuid,bigint,text,text), public.erp_seed_accounts(uuid), public.erp_stock_on_hand(uuid), public.erp_trial_balance(uuid) from public, anon;
grant execute on function public.erp_issue_doc(uuid), public.erp_record_payment(uuid,bigint,text,text), public.erp_seed_accounts(uuid), public.erp_stock_on_hand(uuid), public.erp_trial_balance(uuid) to authenticated;
revoke all on function lois_private.erp_next_no(uuid,text,text), lois_private.erp_acct(uuid,text), lois_private.erp_recalc(uuid) from public, anon, authenticated;
