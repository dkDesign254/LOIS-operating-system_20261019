#!/usr/bin/env bash
# Replays the ERP / business-area migrations (KB-024 to KB-027) and the use case hub (KB-023, KB-023c) on a scratch Postgres 16,
# on top of a small stand-in for the original foundation, then runs the role test.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=pgtest ./supabase/test/replay.sh
# Needs roles anon and authenticated to exist once per cluster:  create role anon nologin; create role authenticated nologin;
set -euo pipefail
cd "$(dirname "$0")/../.."
db="lois_replay_$$"
psql -d postgres -q -c "create database $db"
trap 'psql -d postgres -q -c "drop database $db" >/dev/null' EXIT
run() { psql -d "$db" -q -v ON_ERROR_STOP=1 "$@"; }
run -f supabase/test/stub-foundation.sql
run -c "create function lois_private.is_staff() returns boolean language sql as 'select false'"
for f in 20261030_kb_23_use_case_hub 20261030_kb_23c_hub_live_fixes 20261031_kb_24_erp_core 20261031_kb_24b_stock_adjust 20261031_kb_25_business_areas 20261031_kb_26_business_permissions 20261031_kb_27_ledger_notes; do echo "applying $f"; run -f "supabase/migrations/$f.sql"; done
echo "role test (the expected result is an error that starts with RESULT):"; run -f supabase/test/erp-role-test.sql 2>&1 | grep RESULT || true
