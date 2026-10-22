import type { SupabaseClient } from '@supabase/supabase-js'

/** Embeds texts with the `embed` Edge Function (gte-small, 384-d, free). Returns null if unavailable. */
export async function embedTexts(sb: SupabaseClient, texts: string[]): Promise<number[][] | null> {
  if (!texts.length) return []
  try {
    const { data, error } = await sb.functions.invoke('embed', { body: { texts } })
    if (error || !data?.embeddings || data.embeddings.length !== texts.length) return null
    return data.embeddings as number[][]
  } catch {
    return null
  }
}

export const toVector = (v: number[]) => `[${v.join(',')}]`

/**
 * Best-effort: embeds approved knowledge and active document passages that have no embedding yet.
 * Safe to call any time; search falls back to full-text when embeddings are missing.
 */
export async function indexEmbeddings(sb: SupabaseClient, tenant: string, rounds = 3): Promise<number> {
  let done = 0
  for (let r = 0; r < rounds; r++) {
    const { data: gaps, error } = await sb.rpc('lois_embedding_gaps', { p_tenant: tenant, p_limit: 16 })
    if (error || !gaps?.length) break
    const rows = gaps as { source_kind: string; source_id: string; content: string }[]
    const vecs = await embedTexts(sb, rows.map((g) => g.content))
    if (!vecs) break
    const items = rows.map((g, i) => ({ kind: g.source_kind, id: g.source_id, embedding: toVector(vecs[i]) }))
    const { data: n, error: sErr } = await sb.rpc('lois_set_embeddings', { p_tenant: tenant, p_items: items })
    if (sErr) break
    done += Number(n ?? 0)
    if (rows.length < 16) break
  }
  return done
}
