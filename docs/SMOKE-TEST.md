# LOIS smoke test (30 steps)

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
| 21 | Sign in as dustinekibagendi.hpgk@gmail.com, open Knowledge bank, press Accept on one entry and Reject on another | The queue shows the pending entries; each press shows "Accepted" or "Rejected" and the entry moves tab |
| 22 | Signed out, open `/login` | Google button is first and filled; "Try it without an account" link is under it. No Vercel option anywhere |
| 23 | Signed out, `/try`, enter example.com under "Check a website" | Four scores and up to three fixes; a 6th check within an hour is refused politely; `localhost` is refused |
| 24 | As a reviewer: Knowledge bank, press "Start reviewing" | Entry 1 of N with its text, source links (open in a new tab), related entries and a note box |
| 25 | Reject without a note, then with a note; then Accept the next | First is refused with a reason prompt; each decision shows a confirmation and opens the next entry; the counter drops; Accepted tab shows it with your note kept |
| 26 | Any signed-in page at any width: open My panel, Customise, hide Updates, move Today up, tick Wider, reload | Choices persist for you only; "Not useful" on a suggestion hides it; the panel refreshes itself every 5 minutes |
| 27 | Propose a correction to an accepted entry (paste its ID in Supersedes), accept it, open Version history | Both versions listed, newest first, old one marked superseded |
| 28 | Knowledge bank: read the Search index line, press Index now (repeat until none left) | Count of indexed entries rises to all accepted; or an exact error is shown (send it to Claude) |
| 29 | As owner/admin open Insights; switch 7/30/90 days; as a member try `/app/insights` | Tiles, chart, models, bank breakdown; member gets a 404 |
| 30 | Web research: ask a current question, open two sources, Propose to the Knowledge bank | Findings with sources; the entry appears in the review queue with the web links |
| 31 | Sandbox, Use case hub: open Social media management, edit config, press Run test | A run record with what/when/why/how/expect/accuracy; marked simulated; counts against the test allowance (10 per Nairobi day by default) |
| 32 | Connectors (owner/admin): add a Make webhook connector | Created OFF; the endpoint is not shown back to you |
| 33 | Switch the connector ON with a reason of 8+ characters | Logged with your name, time and reason; Make API refuses on a free-plan workspace |
| 34 | Request a live run; try to approve it as the same person | Refused; a different owner/admin must approve with a note of 5+ characters |
| 35 | After approval, send; Make calls back to `/api/v1/run-callback` with the one-time token | Result stored and labelled "reported" until a person records it |
| 36 | Staff (MFA) change a workspace's run allowance in /internal | New limits apply from the next run; third live run in a day is refused at the default of 3 |
| 37 | Business areas: open /app/areas as owner, add a business, switch on Invoicing with "also switch on" ticked | Contacts and CRM and Invoicing show ON; switching CRM off is refused while Invoicing needs it |
| 38 | Mark a planned area (Payroll) as wanted; as a member view the page | "wanted" shows; the member sees no buttons |
| 39 | With two businesses, share Contacts from one to the other, then unshare | Button flips shared/private; Insights/admin log records both |
