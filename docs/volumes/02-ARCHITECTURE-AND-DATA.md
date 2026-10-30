# Volume 2: Architecture and data (v1.0, 31 October 2026)

## Stack
Next.js 15 (App Router, React 19, TypeScript) on Vercel; Supabase (Postgres, Auth, Edge Functions) project axgrvhfwfyasiafibuye; Neon (analytics mirror, planned); GitHub dkDesign254/LOIS-operating-system_20261019. Only the Supabase publishable key is used in the app. There is no service key in the code, so row-level security is the security boundary.

## Request flow
Browser, then Vercel middleware (crawler refusal, team-alias redirect, session refresh), then server components and server actions acting as the signed-in user through `@supabase/ssr`, then Postgres under row-level security. Anything that must be stronger than a policy is a SECURITY DEFINER function in schema `lois_private` with a thin `public.lois_*` wrapper that has explicit grants.

## Main tables (all with RLS)
Tenancy and access: lois_tenants (type holding_company, business_arm or client), lois_memberships, lois_admin_allowlist, lois_access_requests, lois_member_grants, lois_permissions.
Knowledge: lois_knowledge_items (pending_review, approved, rejected, superseded, expired), lois_embeddings, lois_documents, lois_document_chunks, lois_knowledge_sources.
Conversation: lois_conversations, lois_messages, lois_feedback, lois_help_requests, lois_ai_sessions, lois_ai_turns.
Governance: lois_decisions, lois_decision_records, lois_approvals, lois_audit, lois_execution_events.
Personal: lois_profiles, lois_onboarding, lois_consents, lois_data_requests, lois_my_briefs, lois_brief_prefs, lois_briefings, lois_rail_prefs.
Use case hub (KB-023): lois_use_cases, lois_use_case_configs, lois_connectors, lois_runs, lois_run_limits, lois_admin_log.
Other: lois_updates, lois_vault_items, lois_trials, lois_readiness_scans, lois_api_keys, lois_webhooks, lois_webhook_deliveries, lois_points_events, lois_usage_daily.

## Key database rules (see Volume 3 for why)
Reviewer role required to accept or reject; accepted entries are immutable (new version instead); internal workspaces can only be joined through the approval function; connector addresses cannot be read back by any client; run status moves only through functions; daily run allowances are enforced by a trigger.

## Code layout
`src/lib` pure logic with unit tests (brief, briefing, rail, scan, sources, use-cases, run-record, frameworks); `src/app/app/*` signed-in pages with their `actions.ts`; `src/app/api/v1` public API and run callback; `supabase/migrations` one file per KB step.
