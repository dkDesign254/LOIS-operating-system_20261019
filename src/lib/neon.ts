import { neon } from '@neondatabase/serverless'
import { sha256 } from '@/lib/hash'

// Neon is the audit + analytics mirror. Supabase never depends on it:
// if NEON_DATABASE_URL is unset or a write fails, the app carries on.

export const neonConfigured = () => Boolean(process.env.NEON_DATABASE_URL)

export async function neonLog(
  event: string,
  fields: { tenant_id?: string; actor?: string; query?: string; mode?: string; results?: number; top_score?: number; latency_ms?: number; llm?: boolean; ref?: string },
) {
  const url = process.env.NEON_DATABASE_URL
  if (!url) return
  try {
    const sql = neon(url)
    // Never store raw questions or user ids: hashes only.
    await sql`insert into lois_events (event, tenant_id, actor_hash, query_hash, answer_mode, result_count, top_score, latency_ms, llm_used, ref_id)
      values (${event}, ${fields.tenant_id ?? null}, ${fields.actor ? sha256(fields.actor) : null}, ${fields.query ? sha256(fields.query.toLowerCase().trim()) : null},
              ${fields.mode ?? null}, ${fields.results ?? null}, ${fields.top_score ?? null}, ${fields.latency_ms ?? null}, ${fields.llm ?? false}, ${fields.ref ?? null})`
  } catch {
    // Best-effort by design.
  }
}

export async function neonSummary(tenant_id: string) {
  const url = process.env.NEON_DATABASE_URL
  if (!url) return null
  try {
    const sql = neon(url)
    const rows = await sql`select answer_mode, count(*)::int as n, round(avg(latency_ms))::int as avg_ms
      from lois_events where event = 'ask' and tenant_id = ${tenant_id} and created_at > now() - interval '30 days' group by answer_mode order by n desc`
    return rows as { answer_mode: string; n: number; avg_ms: number }[]
  } catch {
    return null
  }
}
