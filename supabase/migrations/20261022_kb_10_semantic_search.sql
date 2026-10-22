-- KB-010: semantic (embedding) search, additive. Embeddings live in their own table so
-- approved knowledge stays immutable. FTS remains the fallback (lois_search unchanged).
create table if not exists public.lois_embeddings (
  source_kind text not null check (source_kind in ('bank','document')),
  source_id   uuid not null,
  tenant_id   uuid not null references public.lois_tenants(tenant_id) on delete cascade,
  embedding   extensions.vector(384) not null,
  model       text not null default 'gte-small',
  created_at  timestamptz not null default now(),
  primary key (source_kind, source_id)
);
create index if not exists lois_embeddings_tenant_idx on public.lois_embeddings (tenant_id);
create index if not exists lois_embeddings_hnsw on public.lois_embeddings using hnsw (embedding extensions.vector_cosine_ops);
alter table public.lois_embeddings enable row level security;
create policy emb_select on public.lois_embeddings for select to authenticated using (lois_private.is_member(tenant_id));
revoke all on public.lois_embeddings from anon, public;
grant select on public.lois_embeddings to authenticated;

create or replace function lois_private.semantic_core(p_tenant uuid, p_embedding extensions.vector, p_limit integer)
returns table (source_kind text, id uuid, title text, snippet text, content text, score real, evidence_label text, version integer, updated_at timestamptz, document_title text)
language sql stable security definer set search_path = '' as $$
  select h.* from (
    select 'bank'::text, i.knowledge_id, i.title, left(coalesce(i.content,''), 240), left(coalesce(i.content,''), 2000),
           (least(1, greatest(0, (1 - (e.embedding operator(extensions.<=>) p_embedding) - 0.78) / 0.2)) * 1.5)::real,
           i.evidence_label::text, i.version, i.created_at, null::text
    from public.lois_embeddings e join public.lois_knowledge_items i on i.knowledge_id = e.source_id
    where e.source_kind = 'bank' and e.tenant_id = p_tenant and i.tenant_id = p_tenant and i.status = 'approved'
      and (i.valid_until is null or i.valid_until > now()) and (i.valid_from is null or i.valid_from <= now())
    union all
    select 'document'::text, c.chunk_id, d.title, left(c.content, 240), left(c.content, 2000),
           least(1, greatest(0, (1 - (e.embedding operator(extensions.<=>) p_embedding) - 0.78) / 0.2))::real,
           d.evidence_label::text, null::integer, d.updated_at, d.title
    from public.lois_embeddings e join public.lois_document_chunks c on c.chunk_id = e.source_id
      join public.lois_documents d on d.document_id = c.document_id
    where e.source_kind = 'document' and e.tenant_id = p_tenant and c.tenant_id = p_tenant and d.status = 'active'
  ) h(source_kind, id, title, snippet, content, score, evidence_label, version, updated_at, document_title)
  where h.score > 0
  order by h.score desc
  limit least(greatest(coalesce(p_limit, 8), 1), 20)
$$;

create or replace function lois_private.hybrid_for_user(p_tenant uuid, p_query text, p_embedding extensions.vector, p_limit integer)
returns setof lois_private.search_hit
language plpgsql stable security definer set search_path = '' as $$
declare lim integer := least(greatest(coalesce(p_limit, 8), 1), 20);
begin
  if not lois_private.is_member(p_tenant) then raise exception 'not a member of this workspace' using errcode = '42501'; end if;
  return query
    select m.source_kind, m.id, m.title, m.snippet, m.content, m.score, m.evidence_label::text, m.version, m.updated_at, m.document_title
    from (
      select distinct on (u.id) u.* from (
        select f.source_kind, f.id, f.title, f.snippet, f.content, f.score, f.evidence_label, f.version, f.updated_at, f.document_title
          from lois_private.search_core(p_tenant, p_query, lim) f
        union all
        select s.source_kind, s.id, s.title, s.snippet, s.content, s.score, s.evidence_label, s.version, s.updated_at, s.document_title
          from lois_private.semantic_core(p_tenant, p_embedding, lim) s
      ) u order by u.id, u.score desc
    ) m order by m.score desc limit lim;
end $$;

create or replace function lois_private.embedding_gaps(p_tenant uuid, p_limit integer)
returns table (source_kind text, source_id uuid, content text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not lois_private.has_role(p_tenant, array['owner','admin','reviewer','member']) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    (select 'bank'::text, i.knowledge_id, left(i.title || E'\n' || coalesce(i.content,''), 2000)
       from public.lois_knowledge_items i
       where i.tenant_id = p_tenant and i.status = 'approved'
         and not exists (select 1 from public.lois_embeddings e where e.source_kind='bank' and e.source_id = i.knowledge_id)
       limit least(greatest(coalesce(p_limit,20),1),50))
    union all
    (select 'document'::text, c.chunk_id, left(c.content, 2000)
       from public.lois_document_chunks c join public.lois_documents d on d.document_id = c.document_id
       where c.tenant_id = p_tenant and d.status = 'active'
         and not exists (select 1 from public.lois_embeddings e where e.source_kind='document' and e.source_id = c.chunk_id)
       limit least(greatest(coalesce(p_limit,20),1),50));
end $$;

create or replace function lois_private.set_embeddings(p_tenant uuid, p_items jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; n integer := 0; ok boolean;
begin
  if not lois_private.has_role(p_tenant, array['owner','admin','reviewer','member']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'too many items' using errcode = '53400'; end if;
  for r in select * from jsonb_array_elements(p_items) loop
    if r->>'kind' = 'bank' then
      ok := exists (select 1 from public.lois_knowledge_items i where i.knowledge_id = (r->>'id')::uuid and i.tenant_id = p_tenant);
    else
      ok := exists (select 1 from public.lois_document_chunks c where c.chunk_id = (r->>'id')::uuid and c.tenant_id = p_tenant);
    end if;
    if ok then
      insert into public.lois_embeddings (source_kind, source_id, tenant_id, embedding)
      values (r->>'kind', (r->>'id')::uuid, p_tenant, (r->>'embedding')::extensions.vector)
      on conflict (source_kind, source_id) do update set embedding = excluded.embedding, created_at = now();
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.lois_search_hybrid(p_tenant uuid, p_query text, p_embedding extensions.vector, p_limit integer default 8)
returns setof lois_private.search_hit language sql stable set search_path = '' as $$ select * from lois_private.hybrid_for_user(p_tenant, p_query, p_embedding, p_limit) $$;
create or replace function public.lois_embedding_gaps(p_tenant uuid, p_limit integer default 20)
returns table (source_kind text, source_id uuid, content text) language sql stable set search_path = '' as $$ select * from lois_private.embedding_gaps(p_tenant, p_limit) $$;
create or replace function public.lois_set_embeddings(p_tenant uuid, p_items jsonb)
returns integer language sql set search_path = '' as $$ select lois_private.set_embeddings(p_tenant, p_items) $$;

revoke execute on function public.lois_search_hybrid(uuid,text,extensions.vector,integer), public.lois_embedding_gaps(uuid,integer), public.lois_set_embeddings(uuid,jsonb) from public, anon;
grant execute on function public.lois_search_hybrid(uuid,text,extensions.vector,integer), public.lois_embedding_gaps(uuid,integer), public.lois_set_embeddings(uuid,jsonb) to authenticated;
