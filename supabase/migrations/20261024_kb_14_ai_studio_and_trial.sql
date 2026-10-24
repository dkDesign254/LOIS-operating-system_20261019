-- KB-014: AI Studio sessions and turns (shared context across models) and the 25-day sandbox trial.
create table if not exists public.lois_trials (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default now() + interval '25 days',
  extended_by uuid, note text
);
create table if not exists public.lois_ai_sessions (
  session_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'New session' check (char_length(title) <= 160),
  summary text not null default '' check (char_length(summary) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.lois_ai_turns (
  turn_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lois_ai_sessions(session_id) on delete cascade,
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  mode text check (mode in ('auto','compare','chain')),
  task text, provider text, model text, reason text, step text,
  content text not null check (char_length(content) <= 30000),
  ok boolean not null default true,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists lois_ai_sessions_user on public.lois_ai_sessions (user_id, updated_at desc);
create index if not exists lois_ai_turns_session on public.lois_ai_turns (session_id, created_at);
create index if not exists lois_ai_turns_tenant on public.lois_ai_turns (tenant_id);
create index if not exists lois_ai_turns_day on public.lois_ai_turns (user_id, created_at) where role = 'user';

alter table public.lois_trials enable row level security;
alter table public.lois_ai_sessions enable row level security;
alter table public.lois_ai_turns enable row level security;
revoke all on public.lois_trials, public.lois_ai_sessions, public.lois_ai_turns from anon, public;

create policy trials_sel on public.lois_trials for select to authenticated using (user_id = (select auth.uid()) or lois_private.is_staff_mfa());
grant select on public.lois_trials to authenticated;
create policy ais_sel on public.lois_ai_sessions for select to authenticated using (user_id = (select auth.uid()) and lois_private.is_member(tenant_id));
create policy ais_ins on public.lois_ai_sessions for insert to authenticated with check (user_id = (select auth.uid()) and lois_private.is_member(tenant_id));
create policy ais_upd on public.lois_ai_sessions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and lois_private.is_member(tenant_id));
create policy ais_del on public.lois_ai_sessions for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.lois_ai_sessions to authenticated;
grant update (title, summary, updated_at) on public.lois_ai_sessions to authenticated;
create policy ait_sel on public.lois_ai_turns for select to authenticated using (user_id = (select auth.uid()) and lois_private.is_member(tenant_id));
create policy ait_ins on public.lois_ai_turns for insert to authenticated with check (user_id = (select auth.uid()) and lois_private.is_member(tenant_id)
  and exists (select 1 from public.lois_ai_sessions s where s.session_id = lois_ai_turns.session_id and s.user_id = (select auth.uid())));
grant select, insert on public.lois_ai_turns to authenticated;

-- Starts the clock on first use. Staff and internal workspaces are exempt in the app.
create or replace function lois_private.my_trial() returns table (started_at timestamptz, ends_at timestamptz, days_left int, ended boolean) language plpgsql security definer set search_path = '' as $$
declare r public.lois_trials;
begin
  if (select auth.uid()) is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.lois_trials (user_id) values ((select auth.uid())) on conflict (user_id) do nothing;
  select * into r from public.lois_trials where user_id = (select auth.uid());
  return query select r.started_at, r.ends_at, greatest(0, ceil(extract(epoch from (r.ends_at - now())) / 86400))::int, r.ends_at <= now();
end $$;

create or replace function lois_private.extend_trial(p_email text, p_days int, p_note text) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare uid uuid; newend timestamptz;
begin
  if not lois_private.is_staff_mfa() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_days < 1 or p_days > 90 then raise exception 'choose 1 to 90 days' using errcode = '22023'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then raise exception 'no account with that email' using errcode = '22023'; end if;
  insert into public.lois_trials (user_id) values (uid) on conflict (user_id) do nothing;
  update public.lois_trials set ends_at = greatest(ends_at, now()) + make_interval(days => p_days), extended_by = (select auth.uid()), note = left(p_note, 200) where user_id = uid returning ends_at into newend;
  return newend;
end $$;

create or replace function lois_private.ai_used_today() returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.lois_ai_turns where user_id = (select auth.uid()) and role = 'user' and created_at >= date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi'
$$;

create or replace function public.lois_my_trial() returns table (started_at timestamptz, ends_at timestamptz, days_left int, ended boolean) language sql set search_path = '' as $$ select * from lois_private.my_trial() $$;
create or replace function public.lois_extend_trial(p_email text, p_days int, p_note text default null) returns timestamptz language sql set search_path = '' as $$ select lois_private.extend_trial(p_email, p_days, p_note) $$;
create or replace function public.lois_ai_used_today() returns int language sql stable set search_path = '' as $$ select lois_private.ai_used_today() $$;
revoke execute on function public.lois_my_trial(), public.lois_extend_trial(text,int,text), public.lois_ai_used_today() from public, anon;
grant execute on function public.lois_my_trial(), public.lois_extend_trial(text,int,text), public.lois_ai_used_today() to authenticated;
