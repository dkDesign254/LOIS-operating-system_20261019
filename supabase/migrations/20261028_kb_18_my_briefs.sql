-- KB-018: a customer's own saved Decision Briefs.
create table if not exists public.lois_my_briefs (
  brief_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  payload jsonb not null,
  score int not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists lois_my_briefs_user on public.lois_my_briefs (user_id, created_at desc);
alter table public.lois_my_briefs enable row level security;
revoke all on public.lois_my_briefs from anon, public;
create policy mb_sel on public.lois_my_briefs for select to authenticated using (user_id = (select auth.uid()) and lois_private.is_member(tenant_id));
create policy mb_ins on public.lois_my_briefs for insert to authenticated with check (user_id = (select auth.uid()) and lois_private.has_role(tenant_id, array['owner','admin','reviewer','member']) and pg_column_size(payload) < 20000);
create policy mb_del on public.lois_my_briefs for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.lois_my_briefs to authenticated;
