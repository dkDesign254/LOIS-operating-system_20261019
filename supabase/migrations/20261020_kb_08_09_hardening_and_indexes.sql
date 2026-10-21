-- Applied to Supabase project axgrvhfwfyasiafibuye on 2026-10-20 as KB-008 and KB-009.
-- Earlier migrations (KB-001 .. KB-007, versions 20261019231329-20261019231657) live in the
-- project's Supabase migration history. Export them with `supabase db pull` to keep a full copy here.

-- KB-008: function hardening
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

revoke execute on function public.lois_search(uuid, text, integer) from public, anon;
revoke execute on function public.lois_bootstrap_session() from public, anon;
revoke execute on function public.lois_bump_usage(uuid, text) from public, anon;
revoke execute on function public.lois_leaderboard(uuid) from public, anon;
revoke execute on function public.lois_webhook_log(uuid, uuid, text, integer, boolean, text) from public, anon;
revoke execute on function public.lois_webhook_prepare(uuid, text, text, bigint) from public, anon;
grant execute on function public.lois_search(uuid, text, integer) to authenticated;
grant execute on function public.lois_bootstrap_session() to authenticated;
grant execute on function public.lois_bump_usage(uuid, text) to authenticated;
grant execute on function public.lois_leaderboard(uuid) to authenticated;
grant execute on function public.lois_webhook_log(uuid, uuid, text, integer, boolean, text) to authenticated;
grant execute on function public.lois_webhook_prepare(uuid, text, text, bigint) to authenticated;
-- lois_api_* remain callable by anon on purpose: key-hash auth, scope and quota enforced in the database.

-- KB-009: covering indexes
create index if not exists lois_conversations_tenant_updated_idx on public.lois_conversations (tenant_id, updated_at desc);
create index if not exists lois_conversations_project_idx on public.lois_conversations (project_id) where project_id is not null;
create index if not exists lois_documents_project_idx on public.lois_documents (project_id) where project_id is not null;
create index if not exists lois_feedback_tenant_idx on public.lois_feedback (tenant_id);
create index if not exists lois_help_requests_conversation_idx on public.lois_help_requests (conversation_id) where conversation_id is not null;
create index if not exists lois_help_requests_message_idx on public.lois_help_requests (message_id) where message_id is not null;
create index if not exists lois_help_requests_item_idx on public.lois_help_requests (resolved_item_id) where resolved_item_id is not null;
create index if not exists lois_knowledge_items_project_idx on public.lois_knowledge_items (project_id) where project_id is not null;
create index if not exists lois_knowledge_items_source_idx on public.lois_knowledge_items (source_id) where source_id is not null;
create index if not exists lois_knowledge_items_supersedes_idx on public.lois_knowledge_items (supersedes_id) where supersedes_id is not null;
create index if not exists lois_projects_tenant_idx on public.lois_projects (tenant_id);
create index if not exists lois_api_keys_tenant_idx on public.lois_api_keys (tenant_id);
create index if not exists lois_webhooks_tenant_idx on public.lois_webhooks (tenant_id);
create index if not exists lois_webhook_deliveries_webhook_idx on public.lois_webhook_deliveries (webhook_id);
create index if not exists lois_tenants_created_by_idx on public.lois_tenants (created_by);
