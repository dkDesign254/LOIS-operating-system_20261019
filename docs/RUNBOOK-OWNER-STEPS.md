# LOIS runbook: steps only the owner can do

Prepared for Dustine Kibagendi, The Lucrebag. Updated 28 October 2026. About 15 minutes in total.

## 1. Remove the Vercel login (fixes new accounts and the "Access request" emails)
1. Vercel, project lois-operating-system_20261019, Settings, Deployment Protection.
2. Set Vercel Authentication to Disabled for Production and Preview. LOIS has its own sign-in and row-level security.
3. Settings, Environment Variables: `NEXT_PUBLIC_SITE_URL` = `https://lois-operating-system20261019.vercel.app` (not the `-dkdesign254s-projects` address). Redeploy.
Check: open the team address in a private window. It should redirect to the public address with no Vercel login.

## 2. Supabase sign-in settings
1. Authentication, URL Configuration: Site URL = the public address; redirect list = the public address with `/**` and `http://localhost:3000/**` only. Remove any `-dkdesign254s-projects` entry.
2. Authentication, Email Templates: links use `{{ .ConfirmationURL }}`.
3. Authentication, SMTP: turn custom SMTP off, or complete every field.
4. Enable TOTP and leaked-password protection; minimum password length 10.

## 3. Provider keys (Vercel environment variables, then redeploy)
`GOOGLE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, optional `ANTHROPIC_API_KEY`. Never put keys in the repository (it is public).

## 4. Staff
Sign in as thelucrebag@gmail.com, dustinekibagendi.hpgk@gmail.com or admin.lucrebag@gmail.com. All three own both internal workspaces. Open Staff console, enrol an authenticator app.

## 5. Review the knowledge bank
Open Knowledge bank. Accept or reject the pending entries (69 harvested). Rejected entries are read-only.

## 6. Run the smoke test
`docs/SMOKE-TEST.md`, 20 steps.

## 7. Decisions needed from you
- Which Google Drive folder should hold a copy of the closed vault, and who may open it.
- A public contact email for the privacy notice and landing page.
- Videos on how to avoid a "vibe-coded" look.
