-- KB-015: saved agent-readiness scans. A scan reads one public web page and its robots.txt, sitemap and llms.txt, then scores it.
create table if not exists public.lois_readiness_scans (
  scan_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null check (char_length(url) <= 500),
  host text not null check (char_length(host) <= 253),
  scores jsonb not null default '{}'::jsonb,
  checks jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lois_readiness_scans_tenant on public.lois_readiness_scans (tenant_id, created_at desc);
create index if not exists lois_readiness_scans_user_day on public.lois_readiness_scans (user_id, created_at);
alter table public.lois_readiness_scans enable row level security;
revoke all on public.lois_readiness_scans from anon, public;
create policy rs_sel on public.lois_readiness_scans for select to authenticated using (lois_private.is_member(tenant_id));
create policy rs_ins on public.lois_readiness_scans for insert to authenticated with check (user_id = (select auth.uid()) and lois_private.is_member(tenant_id));
create policy rs_del on public.lois_readiness_scans for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.lois_readiness_scans to authenticated;
