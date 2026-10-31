-- KB-027: business guards, ledger/stock business fill, per-business trial balance, promissory note functions.
create or replace function lois_private.erp_guard_business() returns trigger language plpgsql security definer set search_path = '' as $$
declare b uuid;
begin
  if tg_table_name = 'erp_docs' then b := coalesce(new.business_id, old.business_id);
  elsif tg_table_name = 'erp_payments' then select business_id into b from public.erp_docs where doc_id = new.doc_id;
  end if;
  if (select auth.uid()) is not null and b is not null and not lois_private.can_see_business(b) then raise exception 'You do not have access to this business' using errcode = '42501'; end if;
  return new;
end $$;
create trigger erp_docs_guard before update on public.erp_docs for each row execute function lois_private.erp_guard_business();
create trigger erp_payments_guard before insert on public.erp_payments for each row execute function lois_private.erp_guard_business();
create or replace function lois_private.erp_fill_business() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.business_id is null then
    new.business_id := (select d.business_id from public.erp_docs d where d.doc_id = new.doc_id);
    if new.business_id is null and tg_table_name = 'erp_stock_moves' then new.business_id := (select p.business_id from public.erp_products p where p.product_id = new.product_id); end if;
  end if;
  return new;
end $$;
create trigger erp_journal_fill before insert on public.erp_journal for each row execute function lois_private.erp_fill_business();
create trigger erp_stock_fill before insert on public.erp_stock_moves for each row execute function lois_private.erp_fill_business();
create or replace function public.erp_trial_balance_b(p_business uuid) returns table(code text, name text, debit bigint, credit bigint) language sql security definer set search_path = '' as $$
  select a.code, a.name, coalesce(sum(l.debit),0)::bigint, coalesce(sum(l.credit),0)::bigint
  from public.lois_businesses b join public.erp_accounts a on a.tenant_id = b.tenant_id
  left join public.erp_journal j on j.business_id = b.business_id
  left join public.erp_journal_lines l on l.entry_id = j.entry_id and l.account_id = a.account_id
  where b.business_id = p_business and lois_private.can_see_business(p_business) group by a.code, a.name order by a.code $$;
revoke all on function public.erp_trial_balance_b(uuid) from public, anon;
grant execute on function public.erp_trial_balance_b(uuid) to authenticated;
revoke all on function lois_private.erp_guard_business(), lois_private.erp_fill_business() from public, anon, authenticated;

create or replace function public.erp_note_new(p_business uuid, p_contact uuid, p_principal bigint, p_interest_bp int, p_due date, p_terms text, p_doc uuid) returns text language plpgsql security definer set search_path = '' as $$
declare b public.lois_businesses; no text;
begin
  select * into b from public.lois_businesses where business_id = p_business;
  if b.business_id is null or not lois_private.has_role(b.tenant_id, array['owner','admin','member']) or not lois_private.can_see_business(p_business) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.erp_contacts c where c.contact_id = p_contact and c.tenant_id = b.tenant_id) then raise exception 'Choose a contact'; end if;
  no := lois_private.erp_next_no(b.tenant_id, 'note', 'PN');
  insert into public.erp_promissory_notes(tenant_id, business_id, contact_id, doc_id, number, principal, currency, interest_bp, due_on, terms, created_by)
    values (b.tenant_id, p_business, p_contact, p_doc, no, p_principal, b.currency, p_interest_bp, p_due, left(p_terms, 1000), (select auth.uid()));
  return no;
end $$;
create or replace function public.erp_note_status(p_note uuid, p_status text, p_signer text) returns void language plpgsql security definer set search_path = '' as $$
declare n public.erp_promissory_notes;
begin
  select * into n from public.erp_promissory_notes where note_id = p_note for update;
  if n.note_id is null or not lois_private.has_role(n.tenant_id, array['owner','admin','member']) or not lois_private.can_see_business(n.business_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_status = 'signed' then
    if n.status <> 'draft' then raise exception 'Only a draft can be signed'; end if;
    if char_length(coalesce(trim(p_signer), '')) < 2 then raise exception 'Enter the name of the person who signed'; end if;
    update public.erp_promissory_notes set status = 'signed', signed_by_name = left(trim(p_signer), 120), signed_on = current_date where note_id = p_note;
  elsif p_status in ('settled','defaulted') then
    if n.status <> 'signed' then raise exception 'Only a signed note can be settled or defaulted'; end if;
    update public.erp_promissory_notes set status = p_status where note_id = p_note;
  elsif p_status = 'void' then
    if n.status not in ('draft','signed') then raise exception 'This note cannot be voided'; end if;
    update public.erp_promissory_notes set status = 'void' where note_id = p_note;
  else raise exception 'Unknown status'; end if;
end $$;
revoke all on function public.erp_note_new(uuid,uuid,bigint,int,date,text,uuid), public.erp_note_status(uuid,text,text) from public, anon;
grant execute on function public.erp_note_new(uuid,uuid,bigint,int,date,text,uuid), public.erp_note_status(uuid,text,text) to authenticated;
