# Database export status (31 Oct 2026)

Replay-tested: KB-023 (with KB-023c fixes), KB-024, KB-024b, KB-025, KB-026, KB-027 replay in order on a fresh PostgreSQL 16, on top of a small stand-in for the original foundation, and the role test passes (`supabase/test/replay.sh`). The three hub functions that differed from live (connector switch, run finish, run cap) now match the live definitions exactly (same hashes), and connector addresses are unreadable to signed-in users.

STILL MISSING FROM THE REPO: the foundation migrations that built the original schema (live names kb_00 to kb_07, plus kb_16 and anything applied outside the repo). The repo starts at kb_08. A new developer cannot rebuild the whole database from this repo alone. To fix: dump the live schema (`supabase db dump --schema public,lois_private` with the owner's CLI login) and commit it as `supabase/migrations/20261019_kb_00_foundation.sql`. The MCP connection used so far cannot produce a full dump.

Policies: the old broad select policies on the erp_* and business tables still exist; restrictive policies (suffix _biz) narrow them. The SQL runner used here cannot drop policies. Fold them together later with a normal CLI session.

Known: `lois_run_callback` and the run-cap trigger function are executable by the signed-out role by design (the callback is protected by a one-time token hash); keep that in mind in any security review.
