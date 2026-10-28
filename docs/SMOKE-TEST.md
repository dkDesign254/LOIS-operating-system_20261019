# LOIS smoke test (10 minutes)

Prepared for Dustine Kibagendi, The Lucrebag. Run in a private window after each deploy. Tick each line; send anything that differs from "Expect" to Claude with a screenshot.

| # | Do | Expect |
|---|----|--------|
| 1 | Open `/api/v1/health` | `status: ok`, `database: true`. `analytics_mirror: true` once Neon is connected |
| 2 | Open `/` and answer the three homepage questions | You land on Create account; nothing is saved yet |
| 3 | Continue with Google | Three questions are skipped (already answered), consent screen shows, tick the box, Continue |
| 4 | After consent | App opens with the left menu (18 items) and your role under it ("owner · free plan") |
| 5 | Sign out, then sign in with an emailed code | Code arrives (needs the SMTP fix), signs you in without the questions |
| 6 | Sign out, Forgot password, open the email link | "Choose a new password" page, then you are in the app |
| 7 | Start here | Readiness shows five separate measures, no single score |
| 8 | Knowledge base: add a short document, wait 10 s, ask a reworded question in Ask LOIS | Answer cites the document. If not, tell Claude the exact wording (this tunes the 0.78 cutoff) |
| 9 | Decisions: open a draft, submit, record a decision with a reason | Recorded as "not executed"; a high-risk request without evidence cannot be approved |
| 10 | Team: invite a test email as Member; open Privileges by person; deny "Decisions" for them | Row shows deny; their Record button disappears after they sign in |
| 11 | Privacy & my data: download my data | JSON file with your consents and answers |
| 12 | Privacy & my data: send a "correct my data" request | Appears in the list as open |
| 13 | Signed out, open `/try`, fill in a decision, two options and one piece of evidence | A score, gaps, questions, a message to copy; nothing leaves the browser. "Save it free" goes to sign-up |
| 14 | Sign up as a new person, then open Profile, Ask for team access | You only see your own workspace. A request appears as waiting. No staff areas show |
| 15 | As staff with an authenticator, open Staff console | The request is listed; Approve gives access to the chosen internal workspace. Deny sends your note |
| 16 | Open Daily briefing | After 09:40 Nairobi on a weekday it shows counts with sources; Listen reads it aloud; weekend setting is respected |
| 17 | Staff console: post an update | It appears in the right-hand panel for everyone (screens 1280px or wider) |
| 18 | Staff console, Vault: store an item. Then check a normal account | Staff see it; a normal account gets a 404 for `/internal/vault` |
| 19 | Open `/robots.txt` and `/sitemap.xml` | `/app`, `/internal`, `/api` are disallowed; `/try` and guides listed |
| 20 | Open the `-dkdesign254s-projects` address after turning Protection off | It redirects to the public address, no Vercel login |
