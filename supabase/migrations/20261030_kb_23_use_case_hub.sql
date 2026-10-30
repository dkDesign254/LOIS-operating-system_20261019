-- KB-023: Use Case Hub, connectors, run log, run limits, admin log.
create table if not exists public.lois_use_cases (
  use_case_id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,60}$'),
  title text not null, category text not null, summary text not null,
  steps jsonb not null default '[]', standard_config jsonb not null default '{}', config_fields jsonb not null default '[]',
  outward boolean not null default false, reversible boolean not null default true,
  status text not null default 'template' check (status in ('template','ready','retired')),
  created_at timestamptz not null default now()
);
alter table public.lois_use_cases enable row level security;
create policy uc_sel on public.lois_use_cases for select to authenticated using (status <> 'retired');

create table if not exists public.lois_use_case_configs (
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  use_case_id uuid not null references public.lois_use_cases(use_case_id) on delete cascade,
  mode text not null default 'standard' check (mode in ('standard','custom')),
  config jsonb not null default '{}', updated_by uuid, updated_at timestamptz not null default now(),
  primary key (tenant_id, use_case_id)
);
alter table public.lois_use_case_configs enable row level security;
create policy ucc_sel on public.lois_use_case_configs for select to authenticated using (lois_private.is_member(tenant_id));
create policy ucc_ins on public.lois_use_case_configs for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','member']));
create policy ucc_upd on public.lois_use_case_configs for update to authenticated using (lois_private.has_role(tenant_id, array['owner','admin','member'])) with check (lois_private.has_role(tenant_id, array['owner','admin','member']));

create table if not exists public.lois_connectors (
  connector_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  provider text not null check (provider in ('make','n8n','zapier','langchain','odoo','zoho','custom')),
  method text not null check (method in ('webhook','api')),
  label text not null check (char_length(label) between 2 and 80),
  endpoint text,
  enabled boolean not null default false,
  activated_by uuid, activated_at timestamptz, activation_reason text,
  deactivated_by uuid, deactivated_at timestamptz,
  created_by uuid not null, created_at timestamptz not null default now()
);
alter table public.lois_connectors enable row level security;
revoke select (endpoint) on public.lois_connectors from authenticated, anon;
create policy con_sel on public.lois_connectors for select to authenticated using (lois_private.has_role(tenant_id, array['owner','admin']));
-- Writes go through the functions below so every activation is recorded.

create table if not exists public.lois_admin_log (
  log_id bigint generated always as identity primary key,
  tenant_id uuid not null, actor uuid not null, actor_email text, action text not null, detail jsonb not null default '{}', at timestamptz not null default now()
);
alter table public.lois_admin_log enable row level security;
create policy al_sel on public.lois_admin_log for select to authenticated using (lois_private.has_role(tenant_id, array['owner','admin']) or lois_private.is_staff());

create table if not exists public.lois_run_limits (
  tenant_id uuid primary key references public.lois_tenants(tenant_id) on delete cascade,
  daily_test int not null default 10 check (daily_test between 0 and 100000),
  daily_live int not null default 3 check (daily_live between 0 and 100000),
  note text, updated_by uuid, updated_at timestamptz not null default now()
);
alter table public.lois_run_limits enable row level security;
create policy rl_sel on public.lois_run_limits for select to authenticated using (lois_private.is_member(tenant_id));

create table if not exists public.lois_runs (
  run_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  user_id uuid not null,
  use_case_id uuid not null references public.lois_use_cases(use_case_id),
  mode text not null check (mode in ('test','live')),
  status text not null check (status in ('simulated','awaiting_approval','rejected','sent','succeeded','failed','cancelled')),
  connector_id uuid references public.lois_connectors(connector_id),
  config_mode text, why text, input jsonb not null default '{}',
  record jsonb not null default '{}',
  result jsonb, error text,
  approved_by uuid, approved_at timestamptz, approval_note text,
  callback_hash text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.lois_runs (tenant_id, created_at desc);
alter table public.lois_runs enable row level security;
create policy run_sel on public.lois_runs for select to authenticated using (lois_private.is_member(tenant_id) and (user_id = (select auth.uid()) or lois_private.has_role(tenant_id, array['owner','admin','reviewer'])));
create policy run_ins on public.lois_runs for insert to authenticated with check (user_id = (select auth.uid()) and lois_private.has_role(tenant_id, array['owner','admin','member']) and status in ('simulated','awaiting_approval'));
-- No direct update: status moves only through the functions below.

-- Run allowance for today (Nairobi). Counts runs that were not cancelled or rejected.
create or replace function public.lois_runs_today(p_tenant uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not lois_private.is_member(p_tenant) then null else jsonb_build_object(
    'test_used', (select count(*) from public.lois_runs where tenant_id = p_tenant and mode = 'test' and (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date),
    'live_used', (select count(*) from public.lois_runs where tenant_id = p_tenant and mode = 'live' and status not in ('cancelled','rejected') and (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date),
    'test_cap', coalesce((select daily_test from public.lois_run_limits where tenant_id = p_tenant), 10),
    'live_cap', coalesce((select daily_live from public.lois_run_limits where tenant_id = p_tenant), 3)) end $$;
revoke all on function public.lois_runs_today(uuid) from public, anon; grant execute on function public.lois_runs_today(uuid) to authenticated;

-- Staff with a second factor set a workspace's allowance (what a subscription changes). Recorded in the admin log.
create or replace function public.lois_set_limits(p_tenant uuid, p_test int, p_live int, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if not lois_private.is_staff_mfa() then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.lois_run_limits(tenant_id, daily_test, daily_live, note, updated_by, updated_at) values (p_tenant, p_test, p_live, left(p_note, 200), uid, now())
  on conflict (tenant_id) do update set daily_test = excluded.daily_test, daily_live = excluded.daily_live, note = excluded.note, updated_by = uid, updated_at = now();
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (p_tenant, uid, (select auth.jwt() ->> 'email'), 'limits.set', jsonb_build_object('test', p_test, 'live', p_live, 'note', left(p_note, 200)));
end $$;
revoke all on function public.lois_set_limits(uuid, int, int, text) from public, anon; grant execute on function public.lois_set_limits(uuid, int, int, text) to authenticated;

-- Connectors: create, switch on (with a stated reason), switch off. Each step is logged with who and when.
create or replace function public.lois_connector_save(p_tenant uuid, p_provider text, p_method text, p_label text, p_endpoint text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); cid uuid;
begin
  if not lois_private.has_role(p_tenant, array['owner','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_method = 'webhook' and (p_endpoint is null or p_endpoint !~ '^https://[A-Za-z0-9.-]+(/|$)') then raise exception 'a https address is required'; end if;
  insert into public.lois_connectors(tenant_id, provider, method, label, endpoint, created_by) values (p_tenant, p_provider, p_method, p_label, nullif(p_endpoint, ''), uid) returning connector_id into cid;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (p_tenant, uid, (select auth.jwt() ->> 'email'), 'connector.created', jsonb_build_object('connector', cid, 'provider', p_provider, 'method', p_method, 'label', p_label));
  return cid;
end $$;
create or replace function public.lois_connector_switch(p_connector uuid, p_on boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.lois_connectors;
begin
  select * into c from public.lois_connectors where connector_id = p_connector;
  if c.connector_id is null or not lois_private.has_role(c.tenant_id, array['owner','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_on and char_length(coalesce(p_reason, '')) < 8 then raise exception 'say why you are switching this on (8+ characters)'; end if;
  if p_on and c.method = 'api' and c.provider in ('make') and not exists (select 1 from public.lois_tenants t where t.tenant_id = c.tenant_id and t.plan <> 'free') then
    raise exception 'The Make API path needs a paid plan on this workspace. Use a webhook for now.'; end if;
  if p_on then update public.lois_connectors set enabled = true, activated_by = uid, activated_at = now(), activation_reason = left(p_reason, 300), deactivated_by = null, deactivated_at = null where connector_id = p_connector;
  else update public.lois_connectors set enabled = false, deactivated_by = uid, deactivated_at = now() where connector_id = p_connector; end if;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (c.tenant_id, uid, (select auth.jwt() ->> 'email'), case when p_on then 'connector.on' else 'connector.off' end, jsonb_build_object('connector', p_connector, 'provider', c.provider, 'method', c.method, 'reason', left(coalesce(p_reason, ''), 300)));
end $$;
-- The address is handed only to the server action that is about to call it, and only for an enabled connector in a workspace the caller administers.
create or replace function public.lois_connector_endpoint(p_connector uuid) returns text
language sql stable security definer set search_path = '' as $$
  select endpoint from public.lois_connectors where connector_id = p_connector and enabled and lois_private.has_role(tenant_id, array['owner','admin','member']) $$;
revoke all on function public.lois_connector_save(uuid, text, text, text, text), public.lois_connector_switch(uuid, boolean, text), public.lois_connector_endpoint(uuid) from public, anon;
grant execute on function public.lois_connector_save(uuid, text, text, text, text), public.lois_connector_switch(uuid, boolean, text), public.lois_connector_endpoint(uuid) to authenticated;

-- Approval of a live run: needs owner/admin, cannot be the requester, needs a note. Moves status to sent-ready (the server then calls the connector).
create or replace function public.lois_run_decide(p_run uuid, p_approve boolean, p_note text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); r public.lois_runs;
begin
  select * into r from public.lois_runs where run_id = p_run;
  if r.run_id is null or not lois_private.has_role(r.tenant_id, array['owner','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'awaiting_approval' then raise exception 'this run is already %', r.status; end if;
  if r.user_id = uid then raise exception 'a different person must approve this run'; end if;
  if char_length(coalesce(p_note, '')) < 5 then raise exception 'add a short note'; end if;
  update public.lois_runs set status = case when p_approve then 'sent' else 'rejected' end, approved_by = uid, approved_at = now(), approval_note = left(p_note, 300), updated_at = now() where run_id = p_run;
  insert into public.lois_admin_log(tenant_id, actor, actor_email, action, detail) values (r.tenant_id, uid, (select auth.jwt() ->> 'email'), case when p_approve then 'run.approved' else 'run.rejected' end, jsonb_build_object('run', p_run, 'note', left(p_note, 300)));
  return case when p_approve then 'sent' else 'rejected' end;
end $$;
-- The server records what the connector answered (or that it failed). Only the requester or an admin of that workspace.
create or replace function public.lois_run_finish(p_run uuid, p_status text, p_result jsonb, p_error text, p_callback_hash text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.lois_runs;
begin
  select * into r from public.lois_runs where run_id = p_run;
  if r.run_id is null or not (r.user_id = (select auth.uid()) or lois_private.has_role(r.tenant_id, array['owner','admin'])) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status not in ('sent') then raise exception 'run is not in a sendable state'; end if;
  if p_status not in ('succeeded','failed','sent') then raise exception 'bad status'; end if;
  update public.lois_runs set status = p_status, result = p_result, error = left(p_error, 500), callback_hash = p_callback_hash, updated_at = now() where run_id = p_run;
end $$;
-- The connector's scenario can post its result back with the one-time token it was given. Token is compared by hash.
create or replace function public.lois_run_callback(p_run uuid, p_token text, p_result jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or length(p_token) < 20 or octet_length(coalesce(p_result::text, '')) > 20000 then return false; end if;
  update public.lois_runs set status = 'succeeded', result = p_result, updated_at = now()
   where run_id = p_run and status in ('sent','succeeded') and callback_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  return found;
end $$;
revoke all on function public.lois_run_decide(uuid, boolean, text), public.lois_run_finish(uuid, text, jsonb, text, text) from public, anon;
grant execute on function public.lois_run_decide(uuid, boolean, text), public.lois_run_finish(uuid, text, jsonb, text, text) to authenticated;
revoke all on function public.lois_run_callback(uuid, text, jsonb) from public;
grant execute on function public.lois_run_callback(uuid, text, jsonb) to anon, authenticated;

-- The allowance is enforced here, not only on the screen.
create or replace function lois_private.runs_cap() returns trigger language plpgsql security definer set search_path = '' as $$
declare u jsonb;
begin
  u := public.lois_runs_today(new.tenant_id);
  if u is null then
    select jsonb_build_object('test_used', (select count(*) from public.lois_runs where tenant_id = new.tenant_id and mode = 'test' and (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date),
      'live_used', (select count(*) from public.lois_runs where tenant_id = new.tenant_id and mode = 'live' and status not in ('cancelled','rejected') and (created_at at time zone 'Africa/Nairobi')::date = (now() at time zone 'Africa/Nairobi')::date),
      'test_cap', coalesce((select daily_test from public.lois_run_limits where tenant_id = new.tenant_id), 10),
      'live_cap', coalesce((select daily_live from public.lois_run_limits where tenant_id = new.tenant_id), 3)) into u;
  end if;
  if new.mode = 'test' and (u ->> 'test_used')::int >= (u ->> 'test_cap')::int then raise exception 'daily test-run allowance used (%)', u ->> 'test_cap' using errcode = 'P0001'; end if;
  if new.mode = 'live' and (u ->> 'live_used')::int >= (u ->> 'live_cap')::int then raise exception 'daily live-run allowance used (%)', u ->> 'live_cap' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger runs_cap before insert on public.lois_runs for each row execute function lois_private.runs_cap();
