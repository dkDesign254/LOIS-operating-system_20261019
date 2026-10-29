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

/** Same as indexEmbeddings but says what went wrong, so a person can see why search is not indexed. */
export async function indexReport(sb: SupabaseClient, tenant: string, rounds = 6): Promise<{ done: number; error?: string }> {
  let done = 0
  for (let r = 0; r < rounds; r++) {
    const { data: gaps, error } = await sb.rpc('lois_embedding_gaps', { p_tenant: tenant, p_limit: 8 })
    if (error) return { done, error: 'Could not list entries to index: ' + error.message }
    if (!gaps?.length) break
    const rows = gaps as { source_kind: string; source_id: string; content: string }[]
    let vecs: number[][] | null = null
    let why = ''
    try {
      const { data, error: fe } = await sb.functions.invoke('embed', { body: { texts: rows.map((g) => g.content) } })
      if (fe) why = fe.message
      else if (!data?.embeddings || data.embeddings.length !== rows.length) why = 'The embed function answered with an unexpected result' + (data?.error ? ` (${data.error})` : '')
      else vecs = data.embeddings as number[][]
    } catch (e) { why = e instanceof Error ? e.message : 'The embed function could not be reached' }
    if (!vecs) return { done, error: 'The embedding service failed: ' + why }
    const items = rows.map((g, i) => ({ kind: g.source_kind, id: g.source_id, embedding: toVector(vecs![i]) }))
    const { data: n, error: sErr } = await sb.rpc('lois_set_embeddings', { p_tenant: tenant, p_items: items })
    if (sErr) return { done, error: 'Could not save the index: ' + sErr.message }
    done += Number(n ?? 0)
    if (rows.length < 8) break
  }
  return { done }
}
