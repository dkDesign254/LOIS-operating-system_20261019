# LOIS feature audit — 25 Oct 2026 (updated late evening)

Written against what Dustine Kibagendi asked for. "Done" means built, deployed and tested at least once. "Partial" and "Not yet" are stated plainly. Nothing here has been used by a stranger yet, so treat "Done" as "ready to be tested", not "proven".

| # | What was asked | Status | Where it lives | Gap or next step |
|---|---|---|---|---|
| 1 | One place to use every AI model, best model per task, hand-offs, shared context | Done, untested live | AI Studio (`/app/sandbox/studio`), `src/lib/models.ts`, `studio-actions.ts` | Needs provider keys in Vercel. Default model names and fit scores are untested against live APIs. |
| 2 | Auto, Compare and Chain modes | Done | Studio | Same as above. |
| 3 | Separate internal (staff) and external (customer) surfaces, each safe | Done | `is_staff`, `is_staff_mfa`, `/internal`, tenant-type trigger | Staff must enrol an authenticator in `/internal`. Enable TOTP in Supabase. |
| 4 | RBAC with per-person privileges | Done | 12 permissions, per-member grants, Team page | None known. |
| 5 | Sign in with Google, password, emailed code, reset | Done, one blocker | `/login`, `/auth/callback` | Email sending fails until Supabase custom SMTP is turned off or completed. |
| 6 | Sign-in stays on the public address, never Vercel login | Fixed in code | `src/lib/site.ts`, `middleware.ts` | Needs two dashboard changes: Supabase Site URL and redirect list, Vercel Deployment Protection. |
| 7 | Consent, privacy notice, export and delete my data | Done | `/privacy`, `/app/privacy`, consent log | Have a lawyer review the notice. Check Kenya ODPC registration. |
| 8 | Three-question assessment that routes people | Done | `/start`, landing widget | None. |
| 9 | 25-day sandbox countdown | Done | `lois_trials`, trial banner | Staff can extend. No email reminder yet. |
| 10 | Guide strip on every page explaining what is going on | Done on main pages | `PageGuide` | Check every new page gets one. |
| 11 | Knowledge bank where a person approves before it feeds the knowledge base | Done | Bank page, `lois_knowledge_items` | 28 harvested entries are waiting for your approval. |
| 12 | Lighter, more welcoming blue | Done | `globals.css` variables | Sidebar is now light. Check contrast on any page I could not open signed in. |
| 13 | Law Lab-style landing: globe, Enter cue, section markers | Done | `/`, `wire-globe.tsx`, `wire-art.tsx` | Reduced-motion users get a still globe. |
| 14 | Works on every device | Partial | Responsive CSS, 44px touch targets, phone menu is one scrolling row with accessible names, floating launcher sized for phones. Landing and guide pages screenshotted at 390px and 1280px with no horizontal overflow | Signed-in pages (agent readiness, intake, Studio trace) were checked by code and build only, not by screenshot. |
| 15 | Features from the other repos | Partial | Intake (safe names, SHA-256 de-duplication, PDF and image reading, AI draft with confidence into the review queue), run trace, needs-attention counters, floating suggestion launcher, public guides with HowTo data, 69 bank entries | Not built: key vault with failover (keys stay in Vercel), version history snapshots, scheduled publishing, social queue, multi-language. See the harvest table. |
| 16 | "Lucre the AI assistant" knowledge | Done as knowledge, not as code | Her rules, voice, vocabulary, guardrails, logging and front-end touches are in the bank as 14 pending entries (source: strategy-systems-hub, lucre-chat). GAIA from NexusOps has 9 more | Waiting for your approval. LOIS's own assistant prompt has not been changed to copy Lucre. Say if you want that. |
| 17 | Agent-readiness / AI-visibility audit like klaym.ai | Done, untested live | `/app/readiness`, `src/lib/scan.ts`, `safe-fetch.ts`; 22 checks in four measures, prioritised fixes, saved history, 15 scans a day | Logic is unit tested. The live fetch has not been run from Vercel yet. It reads one page plus robots.txt, sitemap.xml and llms.txt. No payments measure: it did not apply. |
| 18 | Resource library of guides | Done | Public `/resources` with 8 guides and HowTo structured data; linked from the landing page and app menu | Add more guides as you learn what people ask. |
| 19 | Borrow API keys from other projects | Declined on purpose | None | The repo is public and I never copy secrets between projects. Add keys in Vercel (see below). |
| 20 | Neon analytics | Not connected | `db/neon/001_analytics.sql` | Run the file, set `NEON_DATABASE_URL`, redeploy. |

## Harvest from your repositories

| Source | Worth porting | Status |
|---|---|---|
| Fashion Lucrebag CMS | Schema-validated JSON from AI; AI drafts and a person approves; vision intake with confidence and review queue; SHA-256 de-duplication and naming; document import; needs-attention counters; step-up re-sign-in; key vault with failover | Built: validated AI drafts, draft-then-approve, confidence flag, de-duplication, naming, PDF and image reading, counters. Not built: step-up re-sign-in, key vault. |
| AgentOps | Span taxonomy, hand-off records, guardrail spans, cost tracking, fail-safe telemetry | Built: Studio run trace with steps, hand-offs and timings. Not built: cost tracking (free tiers), guardrail spans. |
| Strategy & Systems Hub (Lucre lives here) | Graceful fallbacks, rate limits, query logging, rotating prompts, idempotent reconciliation, eight languages | Fallbacks, limits and rotating prompts built into the launcher and Studio. Languages and reconciliation not built. |
| Allwrite Press | Draft, review, publish roles; version history; AI on articles; media naming; llms.txt and JSON-LD | Media naming, llms.txt guidance and structured-data guide done. Version history and scheduled publishing not built. |
| NexusOps (GAIA) | Traceable AI calls, approvals with reasons, governance health score, rule-based fallbacks | Trace and approvals exist. Health score not built. |

## What you need to do

1. In Vercel, add `GOOGLE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` (optional `ANTHROPIC_API_KEY`) and `NEXT_PUBLIC_SITE_URL`, then redeploy.
2. In Supabase, set the Site URL to `https://lois-operating-system20261019.vercel.app`, keep only that address and `http://localhost:3000/**` in redirect URLs, turn off or complete custom SMTP, enable TOTP and leaked-password protection.
3. In Vercel, set Deployment Protection to Standard Protection.
4. Open the Knowledge bank and approve or reject the 69 pending entries.
4b. Add `GOOGLE_API_KEY` to read scans and photos in Intake. Without it, PDFs with real text still work.
5. Walk through `docs/SMOKE-TEST.md`.

## Honest limits

- The Law Lab look is an inspiration, not a copy: different layout, text, colours tuned to LOIS, and original drawings.
- "Qualified entity processes your context" exists today as sending a question to a human reviewer. A directory of qualified people or firms does not exist yet.
- Free-tier model quotas can run out. Auto mode hands off when a provider refuses, but cannot create capacity.
