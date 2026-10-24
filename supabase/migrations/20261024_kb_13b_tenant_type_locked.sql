-- KB-013b: a customer workspace can never be turned into an internal (staff) one by its own owner.
create or replace function lois_private.guard_tenant_type() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_type is distinct from old.tenant_type and not lois_private.is_staff() then
    raise exception 'workspace type can only be changed by staff' using errcode = '42501';
  end if;
  return new;
end $$;
create or replace trigger guard_tenant_type before update of tenant_type on public.lois_tenants for each row execute function lois_private.guard_tenant_type();
