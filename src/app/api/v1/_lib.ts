import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAnon } from '@/lib/supabase/server'
import { sha256 } from '@/lib/hash'

export const API_VERSION = '1'

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'LOIS-API-Version': API_VERSION, 'Cache-Control': 'no-store', ...extra } })
}

export function problem(status: number, code: string, message: string) {
  return json({ api_version: API_VERSION, error: { code, message } }, status)
}

/** Reads the key from "Authorization: Bearer ..." or "X-API-Key". Returns its hash only. */
export function keyHash(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  const raw = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : req.headers.get('x-api-key')?.trim()
  if (!raw || raw.length < 20 || raw.length > 200) return null
  return sha256(raw)
}

/** Maps database error codes raised by the key-checking functions to HTTP statuses. */
export function dbProblem(err: { code?: string; message: string }) {
  switch (err.code) {
    case '28000':
      return problem(401, 'invalid_api_key', 'The API key is missing, invalid or revoked.')
    case '42501':
      return problem(403, 'insufficient_scope', 'This API key does not have the required scope.')
    case '53400':
      return problem(429, 'quota_exceeded', 'Daily API quota for this workspace has been reached.')
    default:
      return problem(400, 'bad_request', err.message)
  }
}

export const sb = supabaseAnon

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const v = await req.json()
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
