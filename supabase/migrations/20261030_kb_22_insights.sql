-- KB-022: workspace insights for owners and admins. Counts only: no message text, no names, no emails.
create or replace function lois_private.insights(p_tenant uuid, p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  d int := least(greatest(coalesce(p_days, 30), 1), 90);
  since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90));
  nmem int;
  r jsonb;
begin
  if not lois_private.has_role(p_tenant, array['owner','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  select count(*) into nmem from public.lois_memberships where tenant_id = p_tenant;
  select jsonb_build_object(
    'days', d,
    'members', (select coalesce(jsonb_object_agg(role, c), '{}'::jsonb) from (select role, count(*) c from public.lois_memberships where tenant_id = p_tenant group by role) x),
    'active_users', (select count(distinct u) from (
        select user_id u from public.lois_messages where tenant_id = p_tenant and created_at >= since
        union select user_id from public.lois_ai_turns where tenant_id = p_tenant and created_at >= since
        union select user_id from public.lois_readiness_scans where tenant_id = p_tenant and created_at >= since) z),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', g::date,
        'asks', (select count(*) from public.lois_messages m where m.tenant_id = p_tenant and m.role = 'user' and m.created_at::date = g::date),
        'studio', (select count(*) from public.lois_ai_turns t where t.tenant_id = p_tenant and t.role = 'user' and t.created_at::date = g::date),
        'scans', (select count(*) from public.lois_readiness_scans s where s.tenant_id = p_tenant and s.created_at::date = g::date),
        'decisions', (select count(*) from public.lois_execution_events e where e.tenant_id = p_tenant and e.event_type in ('knowledge.approved','knowledge.rejected') and e.created_at::date = g::date)
      ) order by g), '[]'::jsonb) from generate_series(since::date, now()::date, interval '1 day') g),
    'bank', jsonb_build_object(
      'by_status', (select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) from (select status, count(*) c from public.lois_knowledge_items where tenant_id = p_tenant group by status) x),
      'by_domain', (select coalesce(jsonb_agg(jsonb_build_object('domain', domain, 'n', c) order by c desc), '[]'::jsonb) from (select domain, count(*) c from public.lois_knowledge_items where tenant_id = p_tenant and status = 'approved' group by domain order by c desc limit 8) x),
      'by_label', (select coalesce(jsonb_object_agg(evidence_label, c), '{}'::jsonb) from (select evidence_label, count(*) c from public.lois_knowledge_items where tenant_id = p_tenant and status = 'approved' group by evidence_label) x),
      'oldest_pending_days', (select coalesce(extract(day from now() - min(created_at))::int, 0) from public.lois_knowledge_items where tenant_id = p_tenant and status = 'pending_review')),
    'help', jsonb_build_object(
      'open', (select count(*) from public.lois_help_requests where tenant_id = p_tenant and status = 'open'),
      'resolved', (select count(*) from public.lois_help_requests where tenant_id = p_tenant and status <> 'open'),
      'avg_hours_to_resolve', (select round(avg(extract(epoch from resolved_at - created_at) / 3600)::numeric, 1) from public.lois_help_requests where tenant_id = p_tenant and resolved_at is not null)),
    'asks', jsonb_build_object(
      'by_mode', (select coalesce(jsonb_object_agg(coalesce(answer_mode, 'unknown'), c), '{}'::jsonb) from (select answer_mode, count(*) c from public.lois_messages where tenant_id = p_tenant and role = 'assistant' and created_at >= since group by answer_mode) x),
      'ratings', (select coalesce(jsonb_object_agg(rating::text, c), '{}'::jsonb) from (select rating, count(*) c from public.lois_feedback where tenant_id = p_tenant and created_at >= since group by rating) x)),
    'models', (select coalesce(jsonb_agg(jsonb_build_object('provider', provider, 'model', model, 'calls', c, 'ok', ok, 'avg_ms', ms) order by c desc), '[]'::jsonb)
        from (select provider, model, count(*) c, count(*) filter (where ok) ok, round(avg(latency_ms))::int ms from public.lois_ai_turns where tenant_id = p_tenant and role = 'assistant' and created_at >= since group by provider, model) x),
    'scans', jsonb_build_object('count', (select count(*) from public.lois_readiness_scans where tenant_id = p_tenant and created_at >= since)),
    -- Section popularity is shown only when at least 3 people are in the workspace, so one person's habits are never exposed.
    'sections', case when nmem >= 3 then (select coalesce(jsonb_agg(jsonb_build_object('section', k, 'visits', n) order by n desc), '[]'::jsonb) from (
        select e.key k, sum((e.value ->> 'n')::int) n from public.lois_rail_prefs p join public.lois_memberships m on m.user_id = p.user_id and m.tenant_id = p_tenant, jsonb_each(p.usage) e group by e.key order by 2 desc limit 10) x) else null end
  ) into r;
  return r;
end $$;
revoke all on function lois_private.insights(uuid, int) from public, anon;

create or replace function public.lois_insights(p_tenant uuid, p_days int default 30) returns jsonb
language sql stable security invoker set search_path = '' as $$ select lois_private.insights(p_tenant, p_days) $$;
revoke all on function public.lois_insights(uuid, int) from public, anon;
grant execute on function public.lois_insights(uuid, int) to authenticated;
