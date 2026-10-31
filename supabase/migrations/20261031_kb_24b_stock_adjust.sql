create or replace function public.erp_stock_adjust(p_product uuid, p_qty numeric, p_reason text, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  select tenant_id into t from public.erp_products where product_id = p_product;
  if t is null or not lois_private.has_role(t, array['owner','admin','member']) then raise exception 'Not allowed'; end if;
  if p_reason not in ('purchase','adjustment','return','opening') then raise exception 'Reason not allowed here'; end if;
  if p_qty = 0 then raise exception 'Quantity cannot be zero'; end if;
  insert into public.erp_stock_moves(tenant_id, product_id, qty, reason, note, created_by) values (t, p_product, p_qty, p_reason, p_note, (select auth.uid()));
end $$;
revoke all on function public.erp_stock_adjust(uuid,numeric,text,text) from public, anon;
grant execute on function public.erp_stock_adjust(uuid,numeric,text,text) to authenticated;
