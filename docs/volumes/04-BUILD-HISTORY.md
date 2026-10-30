# Volume 4: Build history (v1.0, 31 October 2026)

Sequential record. "Tested" = unit or database role tests; "not seen live" = not yet observed on the public site because Vercel Deployment Protection blocked checks from the build environment.

| Step | Date | What was built | Status |
|---|---|---|---|
| KB-001 to 007 | Oct 2026 | Core schema: tenants, memberships, knowledge items, sources, requests, decisions, audit, RLS | Tested (SQL not in repo; pull with `supabase db pull`) |
| KB-008 to 010 | Oct | App, API v1, sandbox, hybrid search with gte-small embeddings | Tested |
| KB-011 | Oct | Control Centre ported: decisions, memory, arms, automations, continuity, learn | Tested |
| KB-012 | Oct | Consent, onboarding, 12 permissions, privacy rights | Tested |
| KB-013, 13b | Oct | Internal versus customer separation, staff console with second factor | Tested |
| KB-014 | Oct | AI Studio, quotas, 25-day trial | Tested |
| KB-016 | 25 Oct | Agent readiness scan, resources, intake, run trace | Tested |
| Harvest | 25 Oct | 69 knowledge entries from repositories as pending review (all later accepted, 72 in total) | Done |
| KB-017 | 27 Oct | Access requests, approval function, trigger guarding internal workspaces | Tested |
| KB-018 | 28 Oct | Try without an account: Decision Brief | Tested |
| KB-019 | 28 Oct | Daily briefing, updates panel, vault | Tested |
| KB-020 | 28 Oct | Every allow-listed staff email owns both internal workspaces | Tested |
| Self-analysis 1 | 28 Oct | Scanner found site-wide noindex bug; fixed with SEO files | Tested |
| Sign-in | 29 Oct | Google always first; guest link on sign-in; guest site check | Tested, not seen live |
| Review queue | 29 Oct | One-at-a-time review with sources, notes, auto-advance; button bug fixed | Tested, seen live by owner |
| KB-021 | 29 Oct | My panel: personal layout, visit counts, suggestions | Tested |
| Self-analysis 2 | 30 Oct | Structured data and contact link fixes | Tested |
| Version history | 30 Oct | Knowledge entry version chain | Not seen live |
| KB-022 | 30 Oct | Admin insights (counts only) | Tested |
| Web research | 30 Oct | Gemini with search grounding, sources, propose to bank | Not seen live; needs GOOGLE_API_KEY |
| KB-023 | 31 Oct | Use case hub, three use cases, connectors, runs, approval, callback, run allowances, admin log, decision frameworks | Tested (46 unit tests, role tests), not seen live |

## Mistakes recorded
Index status was wrongly reported as missing (wrong column) and corrected. The first review-queue release sent no decision value and was fixed. A column privilege revoke did not hide the connector address until table-level select was revoked (caught by a role test).
