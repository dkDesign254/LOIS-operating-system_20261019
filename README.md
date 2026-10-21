# LOIS Operating System: Knowledge Layer

**LOIS prepares and recommends. A person decides.**

A help assistant backed by a knowledge base you control and a knowledge bank that only learns from what a person has verified. Built for The Lucrebag and its clients, with a versioned API so it plugs into the tools they already use.

Owner: Dustine Kibagendi, The Lucrebag.

## What's in it

| Area | What it does |
|---|---|
| **Ask LOIS** | Chat with starter threads (Untangle, Decide, Compare, Learn). Answers come only from approved knowledge, cite their sources and show the evidence label (verified, reported, example). No match means no guess. |
| **Knowledge base** | Paste or upload documents; they are chunked and full-text indexed immediately. |
| **Knowledge bank** | Review queue. Reviewers accept or reject entries; accepted entries are searchable, boosted in ranking, versioned and immutable. A correction is a new version that supersedes the old. |
| **Get help** | One click sends a question to a person. Their answer can be promoted to the bank, so the next person gets it instantly (the relearning loop). |
| **Sandbox** | Dry-run a scenario and see the decision brief. Reads only; `execution: NO`. |
| **Projects, Rewards, Profile** | Group work by engagement; points and a weekly challenge; tone and answer-length preferences. |
| **Integrations** | API keys (hashed), signed webhooks, n8n and Make recipes, optional Neon analytics. |
| **Team** | Invite by email with roles: owner, admin, reviewer, member, viewer. |

## Architecture

```
Browser ── Next.js 15 (Vercel) ──┬── Supabase (system of record: auth, RLS, documents, bank, API keys, webhooks)
                                 ├── Neon (optional: anonymised analytics + audit mirror)
                                 └── Anthropic API (optional: grounded answer writing; off by default)
n8n / Make / your code ── /api/v1 (API key) ──► Supabase RPCs that check key, scope and daily quota in the database
```

- **Security lives in the database.** Every table has row-level security; roles are checked by `lois_private.has_role`. The app uses the public (publishable) key only, so there is no service key to leak.
- **Free tier by design.** Retrieval is Postgres full-text search with a 384-dimension `vector` column ready for embeddings. Answers are extractive (quoted from sources) unless you set `ANTHROPIC_API_KEY`.
- **Compatibility.** See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md).

## Run locally

```bash
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm install
npm run dev
```

## Deploy

1. Import this repo in Vercel (framework: Next.js; defaults are fine).
2. Add environment variables from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; optionally `NEON_DATABASE_URL`, `ANTHROPIC_API_KEY`).
3. In Supabase → **Authentication → URL Configuration**: set **Site URL** to your production URL and add `https://<your-domain>/auth/callback` to **Redirect URLs**.
4. In Supabase → **Authentication → Email Templates → Magic Link**, include `{{ .Token }}` so the email carries the 6-digit code the login page asks for.

## Database

Supabase project `axgrvhfwfyasiafibuye`. Migrations KB-001 to KB-009 are recorded in `lois_migration_registry`; KB-008/009 are in `supabase/migrations/`. Run `supabase db pull` to copy the earlier ones into the repo.

## Verified

An end-to-end test ran against the live database as real roles inside a rolled-back transaction: workspace creation, document indexing, search, pending vs approved visibility, immutability, quota, chat/feedback/help, promotion to bank, webhook signing, API key search and submit, bad-key rejection, anonymous and cross-tenant isolation, and invitation join. All passed.

## Not done yet

- Embedding-based (semantic) search: the vector column exists; an Edge Function using Supabase's built-in `gte-small` model is the next step.
- Automated tests in CI (CI currently typechecks and builds).
- Rate limiting beyond the per-workspace daily quotas.
