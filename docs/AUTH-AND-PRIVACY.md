# Sign-in, privileges and privacy (KB-012)

Owner: Dustine Kibagendi, The Lucrebag.

## What people see
- Sign in with Google, email and password, or an emailed one-time code. Create account and Forgot password are on the same screen.
- First sign-in: three questions, then one consent screen. Nothing is stored before the person signs in and consents. Answers from the homepage stay in the browser tab until then.
- Privacy & my data (in the app): download everything we hold, request correction, restriction or deletion, withdraw optional consent.

## What is logged (tables, all with row-level security)
- `lois_consents`: purpose, policy version, granted/withdrawn, source, time. Append only for the person.
- `lois_onboarding`: the three answers and the recommended start page.
- `lois_data_requests`: export, correct, restrict, delete. Only the person and platform admins can see them.
- `lois_audit`: privilege changes and decisions.
Admins see only aggregate answer counts (`lois_onboarding_summary`).

## Privileges
Twelve permissions across services (see `lois_permissions`). Roles give defaults (`lois_role_permissions`); owners/admins can allow or deny one service for one person, with an optional end date (Team page). Deny always wins. Owners cannot be restricted; nobody can change their own. Recording a decision is enforced in the database by `lois_private.has_perm`.

## Dashboard steps (cannot be done from code)
1. Supabase > Authentication > Providers > Google: enable, paste Google client ID and secret.
2. Google Cloud > APIs & Services > Credentials > OAuth client (Web). Authorised redirect URI: `https://axgrvhfwfyasiafibuye.supabase.co/auth/v1/callback`. Authorised JavaScript origin: the Vercel site URL.
3. Supabase > Authentication > URL Configuration: Site URL = the Vercel site URL; add `<site>/auth/callback` to Redirect URLs.
4. Vercel > Settings > Environment Variables: `NEXT_PUBLIC_OAUTH_PROVIDERS=google`, then redeploy.
5. Fix "Error sending confirmation email": Authentication > Emails > SMTP Settings. Either turn custom SMTP off (built-in mailer, team addresses only, very low limit) or fill every field with a real provider (host, port, user, password, sender). Empty fields with the switch on cause exactly this error.
6. Email templates: include `{{ .Token }}` so people can type the code as well as click the link.
7. Authentication > Sign In / Providers > Email: set minimum password length to 10 and enable leaked-password protection.

## Compliance note
The privacy notice at `/privacy` is a working draft written to follow the Kenya Data Protection Act 2019 and GDPR principles. Have a lawyer review it, and register The Lucrebag with the Office of the Data Protection Commissioner if required for your processing.

## Two surfaces, authenticated separately (KB-013)
- **Public/customer surface** (`/app`): anyone can register. Their workspaces are type `client`. They get Ask LOIS, Knowledge base, Knowledge bank, Get help, Projects, Sandbox, Learn LOIS, Rewards, Integrations, Team, Profile and Privacy. The sandbox is a dry run: nothing is saved or executed.
- **Internal surface**: the Control Centre pages (Start here, Decisions, Memory, Business arms, Automations, Data & backups) only open in staff workspaces (holding company and business arms). A customer who types the address gets a 404.
- **Who is staff**: only emails on `lois_admin_allowlist` with a confirmed address. They become owner of the internal workspaces on sign-in. Staff-only workspaces cannot invite anyone who is not on the allow-list (database trigger), and nobody can change a workspace's type except staff (KB-013b).
- **Staff console** (`/internal`): needs the allow-list plus a second factor (authenticator app, TOTP). The database refuses the console data (`lois_staff_overview`, answer summary, privacy requests) to a session that has not passed the second factor, so it is enforced even if the page were bypassed.
- **Vercel setting**: Deployment Protection must be "Standard Protection" and people must always use the production address `lois-operating-system20261019.vercel.app`. The `-dkdesign254s-projects` address is team-only and asks for a Vercel login.
