# Database export status (31 Oct 2026)

Exported as migration files, written from the SQL actually applied: KB-024 (ERP core, note: the repo copy matches the live version), KB-024b, KB-025 (business areas), KB-026 (business permissions), KB-027 (ledger guards, notes).

NOT yet replay-tested: no blank database was available to run them in order. Do this before trusting the repo for a rebuild: create a Supabase branch or local Postgres, run every file in order, then run the role tests listed in docs/AUDIT.md.

Still unreconciled: KB-023 (use case hub). It was applied live as kb_23a, kb_23b and kb_23c; the repo file kb_23 differs (the connector endpoint is hidden by revoking table select and granting the other columns; some wrapper functions are security definer). Export with pg_get_functiondef and \d output before relying on it.

Policies: the old broad select policies on the erp_* and business tables still exist; restrictive policies (suffix _biz) narrow them. To simplify later, drop the old ones and fold the rule in.
