import type { NextRequest } from 'next/server'
import { dbProblem, json, keyHash, problem, readJson, sb } from '../_lib'

export const dynamic = 'force-dynamic'

// Submits a candidate entry. It always lands in the review queue (pending_review);
// nothing submitted over the API is trusted or searchable until a person accepts it.
export async function POST(req: NextRequest) {
  const hash = keyHash(req)
  if (!hash) return problem(401, 'invalid_api_key', 'Send your key as "Authorization: Bearer <key>" or "X-API-Key".')
  const b = await readJson(req)
  const title = String(b.title ?? '').trim()
  const content = String(b.content ?? '').trim()
  if (!title || !content) return problem(400, 'missing_fields', 'Provide "title" and "content".')

  const { data, error } = await sb().rpc('lois_api_submit', {
    p_key_hash: hash,
    p_title: title,
    p_content: content,
    p_domain: String(b.domain ?? 'general'),
    p_source: String(b.source ?? 'api'),
    p_label: String(b.label ?? b.evidence_label ?? 'reported'),
  })
  if (error) return dbProblem(error)
  return json({ api_version: '1', ...(data as object) }, 201)
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}
