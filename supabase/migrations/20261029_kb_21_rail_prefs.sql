-- KB-021: personal right-hand panel. Each person's layout, usage counts and feedback; visible only to that person.
create table if not exists public.lois_rail_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  dismissed jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.lois_rail_prefs enable row level security;
create policy rail_sel on public.lois_rail_prefs for select to authenticated using (user_id = (select auth.uid()));
create policy rail_ins on public.lois_rail_prefs for insert to authenticated with check (user_id = (select auth.uid()));
create policy rail_upd on public.lois_rail_prefs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy rail_del on public.lois_rail_prefs for delete to authenticated using (user_id = (select auth.uid()));

-- Counts one visit to a section of the app for the signed-in person (bounded: 40 sections, plain names only).
create or replace function public.lois_rail_touch(p_section text) returns void
language plpgsql set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or p_section !~ '^[a-z0-9-]{1,30}$' then return; end if;
  insert into public.lois_rail_prefs(user_id) values (uid) on conflict (user_id) do nothing;
  update public.lois_rail_prefs set
    usage = case
      when usage ? p_section or (select count(*) from jsonb_object_keys(usage)) < 40
      then jsonb_set(usage, array[p_section], jsonb_build_object(
        'n', coalesce((usage -> p_section ->> 'n')::int, 0) + 1,
        'last', to_char(now() at time zone 'Africa/Nairobi', 'YYYY-MM-DD')), true)
      else usage end,
    updated_at = now()
  where user_id = uid;
end $$;
revoke all on function public.lois_rail_touch(text) from public, anon;
grant execute on function public.lois_rail_touch(text) to authenticated;
