# Volume 3: Security, privacy and access control (v1.0, 31 October 2026)

## Layers
1. Sign-in: Google, email and password, emailed code; Supabase Auth; leaked-password protection and TOTP to be enabled in the dashboard.
2. Roles per workspace: owner, admin, reviewer, member, viewer; per-person allow or deny of twelve permissions.
3. Internal versus customer side: new accounts only get a client workspace; internal workspaces need an access request approved by allow-listed staff with a second factor.
4. Row-level security on every table; functions used where a policy is not enough.
5. Staff console and vault need aal2 (authenticator app).
6. Crawler protection: robots rules, noindex header on private areas, refusal of known AI crawlers on private areas.

## Outward actions
A connector is created OFF. Switching it on needs an owner or admin and a reason of at least 8 characters; who and when are logged. Its address is stored in a column no client can select. A live run is requested with a reason, then approved by a different owner or admin with a note; only then does the server send it. Make's API method is refused on a free workspace. Every step appears in lois_admin_log.

## Callback
A connector returns results to /api/v1/run-callback with run_id and a one-time token. The database compares the token by SHA-256 hash and accepts only runs in the sent state. Results are labelled reported until a person records a checked result.

## Privacy
Consent per purpose and policy version; data export, correction, restriction and deletion requests; admin insights are counts only and hide section popularity unless three or more people share a workspace. Web research queries go to Google; the page says so.

## Known limits
Rate limiting for guest site checks is in memory and resets on restart. Deployment Protection on Vercel must be disabled by the owner for public sign-in. The privacy notice is a working draft and needs advocate review and ODPC registration check.
