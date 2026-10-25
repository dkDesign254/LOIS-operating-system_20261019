# LOIS feature audit — 25 Oct 2026

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
| 14 | Works on every device | Partial | Responsive CSS, 44px touch targets, no horizontal overflow at 390px and 1440px on the landing | Signed-in pages only checked by code, not by screenshot. Mobile nav has no focus trap yet. |
| 15 | Features from the other repos | Partial | Knowledge entries only | See the harvest table below. |
| 16 | "Lucre the AI assistant" knowledge | Partial | Editorial-assistant facts from Fashion Lucrebag | No repo I could read contains an assistant named Lucre. Tell me which repo holds her. |
| 17 | Agent-readiness / AI-visibility audit like klaym.ai | Not yet | None | I could not open klaym.ai, only your screenshots. Proposed as the next build. |
| 18 | Resource library of guides | Not yet | None | Proposed alongside item 17. |
| 19 | Borrow API keys from other projects | Declined on purpose | None | The repo is public and I never copy secrets between projects. Add keys in Vercel (see below). |
| 20 | Neon analytics | Not connected | `db/neon/001_analytics.sql` | Run the file, set `NEON_DATABASE_URL`, redeploy. |

## Harvest from your repositories

| Source | Worth porting | Status |
|---|---|---|
| Fashion Lucrebag CMS | Schema-validated JSON from AI; AI drafts and a person approves; vision intake with confidence and review queue; SHA-256 de-duplication and naming; document import; needs-attention counters; step-up re-sign-in; key vault with failover | Recorded as bank entries. Only the "draft then approve" rule is built so far (bank review). |
| AgentOps | Span taxonomy, hand-off records, guardrail spans, cost tracking, fail-safe telemetry | Recorded as bank entries. Studio stores which model answered; a full run trace is not built. |
| Strategy & Systems Hub, Allwrite Press, NexusOps | Not read yet (the reading agent hit a usage limit) | Open. |

## What you need to do

1. In Vercel, add `GOOGLE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` (optional `ANTHROPIC_API_KEY`) and `NEXT_PUBLIC_SITE_URL`, then redeploy.
2. In Supabase, set the Site URL to `https://lois-operating-system20261019.vercel.app`, keep only that address and `http://localhost:3000/**` in redirect URLs, turn off or complete custom SMTP, enable TOTP and leaked-password protection.
3. In Vercel, set Deployment Protection to Standard Protection.
4. Open the Knowledge bank and approve or reject the 28 pending entries.
5. Walk through `docs/SMOKE-TEST.md`.

## Honest limits

- The Law Lab look is an inspiration, not a copy: different layout, text, colours tuned to LOIS, and original drawings.
- "Qualified entity processes your context" exists today as sending a question to a human reviewer. A directory of qualified people or firms does not exist yet.
- Free-tier model quotas can run out. Auto mode hands off when a provider refuses, but cannot create capacity.
