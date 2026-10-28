# LOIS test evidence: 28 October 2026

Prepared for Dustine Kibagendi, The Lucrebag. What was run, what it showed, and what was not run.

## Automated
- Unit tests: 33 passing, 0 failing (`npm test`). Covers helpers, agent-readiness scanner, intake, Decision Brief engine, briefing schedule and wording.
- Typecheck: clean. Production build: succeeds.
- Regression tests added today: headings with attributes counted; fields inside a label counted as labelled; plural wording in the briefing.

## Database (rolled back, run as real accounts)
| Test | Result |
|---|---|
| Non-staff user inserts a membership in an internal workspace | Blocked |
| Non-staff user creates an access request with their own email | Allowed |
| Same user sets their own request to approved | Blocked (0 rows) |
| Same user submits a request with someone else's email | Blocked |
| Non-staff user calls the approve function | Blocked |
| Owner (thelucrebag@gmail.com) approves one pending bank entry and rejects another | Each changed 1 row; statuses became approved and rejected |
| dkdesign254@gmail.com (owner of Acme Ltd only) reads the Lucrebag review queue | Sees nothing (correct: not a member) |
Not run: staff approval of an access request (needs an authenticator-app session).

## Security advisors (Supabase)
Two items, both known: `lois_admin_allowlist` has RLS on and no policies (intentional, hides the list); leaked-password protection is off (turn on in the Supabase dashboard).

## Self-scan with LOIS's own readiness scanner (local production build)
| Page | Before | After |
|---|---|---|
| Landing | 70 / 88 / 46 / 50 | 100 / 100 / 100 / 100 |
| Try | 70 / 88 / 31 / 50 | 100 / 100 / 92 / 100 |
| Resources | 70 / 100 / 46 / 50 | 100 / 100 / 77 / 100 |
| A guide page | 50 / 100 / 69 / 50 | 100 / 100 / 100 / 100 |
| Privacy | 70 / 88 / 54 / 50 | 100 / 100 / 77 / 50 |
Order: Discovery / Access / Usability / Trust.

## Other checks
- AI crawler (GPTBot) requesting `/app`: 403. `/robots.txt`, `/sitemap.xml`, `/llms.txt` and the sharing image return 200.
- `/try` screenshotted at 390px and 1280px: no horizontal overflow. Found and fixed faint text in the draft message.
- Internal links: all point to real routes (42 routes).

## Not verified
- Live sign-in, email sending, and any signed-in click-through (the shell cannot reach the hosts; the Vercel connector returns 404 for this project).
- Voice playback (depends on the visitor's browser).
- Approve and reject in a live browser (database level only).

## Where the documents are filed
Google Drive, folder "LOIS — Lucrebag Operating Intelligence System": 01_Architecture (build record, sign-in and privacy, AI Studio, Control Centre, migrations), 02_Stage_Logs (feature audit), 04_Test_Evidence (smoke test, this file), 05_Runbooks (owner steps), plus "LOIS Document Index 2026-10-28.md" at the top level. Repo copies are in `docs/` and `supabase/migrations/`.
