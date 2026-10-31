-- KB-023c: what differs between kb_23 as first written and the live database. Exported from the live definitions on 31 Oct.
-- 1. Connector addresses cannot be read by signed-in users: table select is revoked and only the listed columns are granted.
revoke select on public.lois_connectors from authenticated, anon;
grant select (connector_id, tenant_id, provider, method, label, enabled, activated_by, activated_at, activation_reason, deactivated_by, deactivated_at, created_by, created_at) on public.lois_connectors to authenticated;

CREATE OR REPLACE FUNCTION public.lois_connector_switch(p_connector uuid, p_on boolean, p_reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare uid uuid := (select auth.uid()); c public.lois_connectors;
begin
  select * into c from public.lois_connectors where connector_id = p_connector;
  if c.connector_id is null or not lois_private.has_role(c.tenant_id, array['owner','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_on and char_length(coalesce(p_reason, '')) < 8 then raise exception 'say why you are switching this on (8+ characters)'; end if;
  if p_on and c.method = 'api' and c.provider = 'make' and not exists (select 1 from public.lois_tenants t where t.tenant_id = c.tenant_id and t.plan <> 'free') then
    raise exception 'The Make API path needs a paid plan on this workspace. Use a webhook for now.'; end if;
  if p_on then update public.lois_connectors set enabled = true, activated_by = uid, activated_at = now(), activation_reason = left(p_reason, 300), deactivated_by = null, deactivated_at = null where connector_id = p_connector;
  else update public.lois_connectors set enabled = false, deactivated_by = uid, deactivated_at = now() where connector_id = p_connector; end if;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (c.tenant_id, uid, (select auth.jwt() ->> 'email'), case when p_on then 'connector.on' else 'connector.off' end, jsonb_build_object('connector', p_connector, 'provider', c.provider, 'method', c.method, 'reason', left(coalesce(p_reason, ''), 300)));
end $function$;

CREATE OR REPLACE FUNCTION public.lois_run_finish(p_run uuid, p_status text, p_result jsonb, p_error text, p_callback_hash text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare r public.lois_runs;
begin
  select * into r from public.lois_runs where run_id = p_run;
  if r.run_id is null or not (r.user_id = (select auth.uid()) or lois_private.has_role(r.tenant_id, array['owner','admin'])) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'sent' then raise exception 'run is not in a sendable state'; end if;
  if p_status not in ('succeeded','failed','sent') then raise exception 'bad status'; end if;
  update public.lois_runs set status = p_status, result = p_result, error = left(p_error, 500), callback_hash = p_callback_hash, updated_at = now() where run_id = p_run;
end $function$;

CREATE OR REPLACE FUNCTION lois_private.runs_cap()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare u jsonb;
begin
  u := jsonb_build_object(
    'test_used', (select count(*) from public.lois_runs where tenant_id = new.tenant_id and mode = 'test' and (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date),
    'live_used', (select count(*) from public.lois_runs where tenant_id = new.tenant_id and mode = 'live' and status not in ('cancelled','rejected') and (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date),
    'test_cap', coalesce((select daily_test from public.lois_run_limits where tenant_id = new.tenant_id), 10),
    'live_cap', coalesce((select daily_live from public.lois_run_limits where tenant_id = new.tenant_id), 3));
  if new.mode = 'test' and (u ->> 'test_used')::int >= (u ->> 'test_cap')::int then raise exception 'daily test-run allowance used (%)', u ->> 'test_cap' using errcode = 'P0001'; end if;
  if new.mode = 'live' and (u ->> 'live_used')::int >= (u ->> 'live_cap')::int then raise exception 'daily live-run allowance used (%)', u ->> 'live_cap' using errcode = 'P0001'; end if;
  return new;
end $function$;
