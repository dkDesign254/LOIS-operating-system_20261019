# Neon: analytics and audit mirror

**Role.** Supabase is the system of record. Neon holds an anonymised activity log so you can study the relearning loop (what gets asked, what has no answer, how fast retrieval is) without querying live data. The app works with Neon switched off.

**Privacy.** Only hashes, counts and timings are written: no raw questions, emails or user ids.

## Set up (once, about 2 minutes)

1. Open your Neon project, **SQL Editor**, and run `db/neon/001_analytics.sql`.
2. Neon → **Connection details** → copy the **pooled** connection string (it contains `-pooler`).
3. Vercel → Project → **Settings → Environment Variables** → add `NEON_DATABASE_URL` (Production and Preview) → redeploy.

Optional: in Neon, create a branch per Vercel preview deployment (Neon's Vercel integration does this automatically on the free plan within its branch limits).

## Check it works

Ask the assistant a question, then in Neon: `select event, answer_mode, latency_ms from lois_events order by id desc limit 5;`

## Useful queries

```sql
-- No-match rate by week
select date_trunc('week', created_at) wk, count(*) filter (where answer_mode = 'no_match')::float / count(*) as no_match_rate
from lois_events where event = 'ask' group by 1 order by 1 desc;

-- Repeated unanswered questions (best new bank entries)
select * from lois_gap_candidates limit 20;
```
