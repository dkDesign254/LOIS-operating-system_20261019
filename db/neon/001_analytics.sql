-- LOIS analytics + audit mirror (Neon). Run once in the Neon SQL editor.
-- Supabase stays the system of record; this store only holds anonymised activity
-- (hashes, counts, timings) so you can analyse the relearning loop without touching live data.
-- No raw questions, emails or user ids are ever written here.

create table if not exists lois_events (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  event         text not null,          -- ask | feedback | escalate | document | bank.approved | bank.rejected | help.resolved
  tenant_id     uuid,
  actor_hash    text,                   -- sha256 of user id
  query_hash    text,                   -- sha256 of lower-cased question
  answer_mode   text,                   -- grounded | extractive | no_match
  result_count  integer,
  top_score     real,
  latency_ms    integer,
  llm_used      boolean not null default false,
  ref_id        text
);

create index if not exists lois_events_tenant_time_idx on lois_events (tenant_id, created_at desc);
create index if not exists lois_events_event_idx on lois_events (event, created_at desc);
create index if not exists lois_events_query_idx on lois_events (tenant_id, query_hash) where query_hash is not null;

-- Questions that keep coming back with no match: the best candidates for new bank entries.
create or replace view lois_gap_candidates as
select tenant_id, query_hash, count(*) as times_asked, max(created_at) as last_asked
from lois_events
where event = 'ask' and answer_mode = 'no_match'
group by tenant_id, query_hash
having count(*) >= 2
order by times_asked desc;

-- Retention: keep 13 months. Schedule with Neon's scheduler or an n8n cron.
-- delete from lois_events where created_at < now() - interval '13 months';
