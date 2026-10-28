-- KB-019: daily briefing preferences and results, staff-posted updates, closed staff vault (second factor only).
create table if not exists public.lois_brief_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  send_time time not null default '09:40',
  weekdays smallint[] not null default '{1,2,3,4,5}',
  weekend text not null default 'off' check (weekend in ('off','ask','on')),
  voice boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.lois_briefings (
  briefing_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  day date not null,
  body jsonb not null,
  regen smallint not null default 0 check (regen between 0 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create table if not exists public.lois_updates (
  update_id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('linkedin','framework','system','ai')),
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 3 and 600),
  link text check (link is null or link ~ '^https://'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.lois_vault_items (
  item_id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 1 and 20000),
  tags text[] not null default '{}',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.lois_brief_prefs enable row level security;
alter table public.lois_briefings enable row level security;
alter table public.lois_updates enable row level security;
alter table public.lois_vault_items enable row level security;
revoke all on public.lois_brief_prefs, public.lois_briefings, public.lois_updates, public.lois_vault_items from anon, public;
create policy bp_all on public.lois_brief_prefs for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy bf_sel on public.lois_briefings for select to authenticated using (user_id = (select auth.uid()) and lois_private.is_member(tenant_id));
create policy bf_ins on public.lois_briefings for insert to authenticated with check (user_id = (select auth.uid()) and lois_private.is_member(tenant_id) and pg_column_size(body) < 30000);
create policy bf_upd on public.lois_briefings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and lois_private.is_member(tenant_id) and pg_column_size(body) < 30000);
create policy up_sel on public.lois_updates for select to authenticated using (true);
create policy up_ins on public.lois_updates for insert to authenticated with check (lois_private.is_staff_mfa());
create policy up_del on public.lois_updates for delete to authenticated using (lois_private.is_staff_mfa());
create policy vault_all on public.lois_vault_items for all to authenticated using (lois_private.is_staff_mfa()) with check (lois_private.is_staff_mfa());
grant select, insert, update on public.lois_brief_prefs to authenticated;
grant select, insert, update on public.lois_briefings to authenticated;
grant select, insert, delete on public.lois_updates to authenticated;
grant select, insert, update, delete on public.lois_vault_items to authenticated;
