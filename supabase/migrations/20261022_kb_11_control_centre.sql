-- KB-011: LOIS Control Centre features (decision briefs, evidence requests, versioned decision records,
-- audit log, memory, next actions, business arms, automations register, continuity items).
-- Mirrors the v0.5 Control Centre artefact, with real role enforcement (the artefact had none).
-- Principle preserved: LOIS prepares and recommends; a person decides. Recording a decision never executes anything.

create table if not exists public.lois_tasks (
  task_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 300),
  why text, how text,
  kind text not null default 'setup' check (kind in ('blocker','setup','learn')),
  priority int not null default 3 check (priority between 1 and 5),
  source text,
  status text not null default 'open' check (status in ('open','done')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create table if not exists public.lois_arms (
  arm_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  name text not null, blurb text,
  kpis jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.lois_memory (
  memory_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  type text not null default 'fact' check (type in ('fact','decision','lesson','risk','idea')),
  text text not null check (char_length(text) between 3 and 600),
  source text,
  example boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.lois_audit (
  audit_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  actor uuid default auth.uid(),
  action text not null, target text, note text, correlation text,
  created_at timestamptz not null default now()
);
create unique index if not exists lois_audit_idem on public.lois_audit (tenant_id, correlation, action) where correlation is not null;
create table if not exists public.lois_decision_briefs (
  brief_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  title text not null check (char_length(title) between 6 and 200),
  arm text, requester text, decision_maker text,
  deadline date,
  reversibility text not null default 'Easy to reverse' check (reversibility in ('Easy to reverse','Hard to reverse','Cannot be reversed')),
  affected text,
  sensitivity text not null default 'Normal' check (sensitivity in ('Normal','Sensitive')),
  risk text not null default 'low' check (risk in ('low','medium','high')),
  amount_kes numeric check (amount_kes is null or amount_kes >= 0),
  evidence_present boolean not null default false,
  evidence_note text,
  evidence_date date,
  source_state text check (source_state is null or source_state in ('validated','unvalidated')),
  status text not null default 'draft' check (status in ('draft','pending','needs_info','approved','rejected')),
  version int not null default 0,
  brief_text text, challenge jsonb not null default '[]'::jsonb, handoff_text text, outcome text,
  decided_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.lois_decision_records (
  record_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  brief_id uuid not null references public.lois_decision_briefs(brief_id) on delete cascade,
  version int not null,
  decision text not null check (decision in ('approved','rejected','needs_info')),
  reason text not null check (char_length(reason) >= 8),
  conditions text, review_date date, expected text,
  brief_snapshot text, challenge_snapshot jsonb,
  actor uuid default auth.uid(),
  executed boolean not null default false check (executed = false),
  correlation text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.lois_evidence_requests (
  request_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  brief_id uuid not null references public.lois_decision_briefs(brief_id) on delete cascade,
  owner text not null, due date, text text not null check (char_length(text) >= 4),
  status text not null default 'open' check (status in ('open','closed')),
  actor uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.lois_scenarios (
  scenario_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  make_id bigint, name text not null, role text, folder text,
  is_on boolean not null default false,
  last_run text,
  state text not null default 'unverified' check (state in ('failing','degraded','unverified','healthy')),
  plain text, action text, source text, checked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.lois_continuity_items (
  item_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  item text not null, status text not null, severity text not null default 'none' check (severity in ('crit','warn','info','none','ok')),
  source text, action text, sort int not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists lois_tasks_tenant on public.lois_tasks (tenant_id, status);
create index if not exists lois_memory_tenant on public.lois_memory (tenant_id, created_at desc);
create index if not exists lois_audit_tenant on public.lois_audit (tenant_id, created_at desc);
create index if not exists lois_briefs_tenant on public.lois_decision_briefs (tenant_id, status, created_at desc);
create index if not exists lois_records_brief on public.lois_decision_records (brief_id);
create index if not exists lois_evreq_brief on public.lois_evidence_requests (brief_id);
create index if not exists lois_arms_tenant on public.lois_arms (tenant_id);
create index if not exists lois_scen_tenant on public.lois_scenarios (tenant_id);
create index if not exists lois_cont_tenant on public.lois_continuity_items (tenant_id);

do $$ declare t text; begin
  foreach t in array array['lois_tasks','lois_arms','lois_memory','lois_audit','lois_decision_briefs','lois_decision_records','lois_evidence_requests','lois_scenarios','lois_continuity_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (lois_private.is_member(tenant_id))', t||'_sel', t);
  end loop;
end $$;

-- writes by members (the person's own actions); decisions themselves only through the RPC below
create policy tasks_ins on public.lois_tasks for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']));
create policy tasks_upd on public.lois_tasks for update to authenticated using (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member'])) with check (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']));
grant insert, update on public.lois_tasks to authenticated;
create policy memory_ins on public.lois_memory for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']) and created_by = auth.uid());
grant insert on public.lois_memory to authenticated;
create policy audit_ins on public.lois_audit for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']) and actor = auth.uid());
grant insert on public.lois_audit to authenticated;
create policy arms_ins on public.lois_arms for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin']));
create policy arms_upd on public.lois_arms for update to authenticated using (lois_private.has_role(tenant_id, array['owner','admin'])) with check (lois_private.has_role(tenant_id, array['owner','admin']));
grant insert, update on public.lois_arms to authenticated;
create policy scen_ins on public.lois_scenarios for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin']));
create policy scen_upd on public.lois_scenarios for update to authenticated using (lois_private.has_role(tenant_id, array['owner','admin'])) with check (lois_private.has_role(tenant_id, array['owner','admin']));
grant insert, update on public.lois_scenarios to authenticated;
create policy cont_ins on public.lois_continuity_items for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin']));
create policy cont_upd on public.lois_continuity_items for update to authenticated using (lois_private.has_role(tenant_id, array['owner','admin'])) with check (lois_private.has_role(tenant_id, array['owner','admin']));
grant insert, update on public.lois_continuity_items to authenticated;
-- briefs: members draft and submit; they cannot set approved/rejected or the version (RPC only)
create policy briefs_ins on public.lois_decision_briefs for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']) and status = 'draft' and version = 0 and created_by = auth.uid());
create policy briefs_upd on public.lois_decision_briefs for update to authenticated
  using (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']) and status in ('draft','pending','needs_info'))
  with check (status in ('draft','pending','needs_info'));
grant insert on public.lois_decision_briefs to authenticated;
grant update (title, arm, requester, decision_maker, deadline, reversibility, affected, sensitivity, risk, amount_kes, evidence_present, evidence_note, evidence_date, source_state, status, brief_text, challenge, handoff_text, updated_at) on public.lois_decision_briefs to authenticated;
create policy evreq_ins on public.lois_evidence_requests for insert to authenticated with check (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']) and actor = auth.uid());
create policy evreq_upd on public.lois_evidence_requests for update to authenticated using (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member'])) with check (lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']));
grant insert on public.lois_evidence_requests to authenticated;
grant update (status) on public.lois_evidence_requests to authenticated;
revoke update on public.lois_tasks from authenticated; grant update (status, done_at, title, why, how, priority) on public.lois_tasks to authenticated;

-- Record a decision: reviewers/admins/owners only, reason required, versioned, idempotent, never executes.
create or replace function lois_private.record_decision(p_brief uuid, p_decision text, p_reason text, p_conditions text, p_review date, p_expected text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.lois_decision_briefs; v int; key text; newstatus text;
begin
  select * into b from public.lois_decision_briefs where brief_id = p_brief;
  if not found then raise exception 'request not found' using errcode = '22023'; end if;
  if not lois_private.has_role(b.tenant_id, array['owner','admin','reviewer']) then raise exception 'only an owner, admin or reviewer can record a decision' using errcode = '42501'; end if;
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

create or replace function lois_private.save_learning(p_brief uuid, p_outcome text)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.lois_decision_briefs;
begin
  select * into b from public.lois_decision_briefs where brief_id = p_brief;
  if not found or not lois_private.has_role(b.tenant_id, array['owner','admin','reviewer','member']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if b.status <> 'approved' then raise exception 'learning reviews are for approved decisions' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_outcome,''))) < 8 then raise exception 'describe what happened first' using errcode = '22023'; end if;
  update public.lois_decision_briefs set outcome = left(btrim(p_outcome),500), updated_at = now() where brief_id = b.brief_id;
  insert into public.lois_memory (tenant_id, type, text, source, created_by) values (b.tenant_id, 'lesson', left('Learning review for "' || b.title || '": ' || btrim(p_outcome), 600), 'Learning review', auth.uid());
  insert into public.lois_audit (tenant_id, actor, action, target, note) values (b.tenant_id, auth.uid(), 'Learning review saved', b.title, null);
end $$;

create or replace function public.lois_record_decision(p_brief uuid, p_decision text, p_reason text, p_conditions text default null, p_review date default null, p_expected text default null)
returns jsonb language sql set search_path = '' as $$ select lois_private.record_decision(p_brief, p_decision, p_reason, p_conditions, p_review, p_expected) $$;
create or replace function public.lois_save_learning(p_brief uuid, p_outcome text)
returns void language sql set search_path = '' as $$ select lois_private.save_learning(p_brief, p_outcome) $$;
revoke execute on function public.lois_record_decision(uuid,text,text,text,date,text), public.lois_save_learning(uuid,text) from public, anon;
grant execute on function public.lois_record_decision(uuid,text,text,text,date,text), public.lois_save_learning(uuid,text) to authenticated;
