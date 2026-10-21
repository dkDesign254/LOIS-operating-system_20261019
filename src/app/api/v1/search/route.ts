import type { NextRequest } from 'next/server'
import { dbProblem, json, keyHash, problem, readJson, sb } from '../_lib'

export const dynamic = 'force-dynamic'

type Hit = { source_kind: string; id: string; title: string; snippet: string; score: number; evidence_label: string; version: number | null; updated_at: string; document_title: string | null }

async function run(req: NextRequest, query: string, limitRaw: unknown) {
  const hash = keyHash(req)
  if (!hash) return problem(401, 'invalid_api_key', 'Send your key as "Authorization: Bearer <key>" or "X-API-Key".')
  const q = query.trim().slice(0, 400)
  if (!q) return problem(400, 'missing_query', 'Provide "query" (or "q").')
  const limit = Math.min(20, Math.max(1, Number(limitRaw) || 8))

  const { data, error } = await sb().rpc('lois_api_search', { p_key_hash: hash, p_query: q, p_limit: limit })
  if (error) return dbProblem(error)

  const results = ((data ?? []) as Hit[]).map((h) => ({
    id: h.id,
    kind: h.source_kind === 'bank' ? 'knowledge_bank' : 'document',
    title: h.document_title ?? h.title,
    snippet: h.snippet.replace(/<\/?b>/g, ''),
    evidence_label: h.evidence_label,
    score: h.score,
    version: h.version,
    updated_at: h.updated_at,
  }))
  return json({ api_version: '1', query: q, count: results.length, results })
}

// Tolerant reader: unknown fields are ignored, "q" is accepted as an alias for "query".
export async function POST(req: NextRequest) {
  const b = await readJson(req)
  return run(req, String(b.query ?? b.q ?? ''), b.limit)
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  return run(req, p.get('query') ?? p.get('q') ?? '', p.get('limit'))
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}
