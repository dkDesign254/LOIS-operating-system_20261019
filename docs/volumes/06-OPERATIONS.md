# Volume 6: Operations (v1.0, 31 October 2026)

## Owner steps that only the owner can do
1. Vercel: Deployment Protection, Vercel Authentication set to Disabled for Production and Preview.
2. Vercel environment variables: NEXT_PUBLIC_SITE_URL (public address), NEXT_PUBLIC_OAUTH_PROVIDERS (google, optionally github), GOOGLE_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, optional ANTHROPIC_API_KEY. Redeploy.
3. Supabase: Site URL and redirect URLs, Google provider client secret, SMTP, TOTP, leaked-password protection, minimum password length 10.
4. Staff: enrol an authenticator in the Staff console.
5. Neon: run db/neon/001_analytics.sql, set NEON_DATABASE_URL.
6. Advocate review of the privacy notice and the legal drafts in Volume 9; ODPC registration check.

## After every deploy
Run docs/SMOKE-TEST.md (30 steps, more added as features land). Check /api/v1/health.

## Monitoring
Insights page for activity and model reliability; Admin log on the Connectors page for outward switches and approvals; Supabase advisors for security.

## Backups
See docs/RUNBOOK-OWNER-STEPS.md and the Data and backups page.

## Rollback
Every migration is additive. To undo a feature, revert the commit and leave tables in place; do not drop data.
