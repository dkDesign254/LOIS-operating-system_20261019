import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Your automation posts its result here with the one-time token LOIS gave it. The database compares the token by hash.
export async function POST(req: Request) {
  let b: { run_id?: string; token?: string; result?: unknown }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!b.run_id || !b.token) return NextResponse.json({ error: 'run_id_and_token_required' }, { status: 400 })
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', { auth: { persistSession: false } })
  const { data, error } = await sb.rpc('lois_run_callback', { p_run: b.run_id, p_token: b.token, p_result: b.result ?? {} })
  if (error || !data) return NextResponse.json({ error: 'not_accepted' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
