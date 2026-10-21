import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase/server'

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/app'
}

// Handles magic links (?code=... PKCE, or ?token_hash=...&type=...) and OAuth returns.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))

  const sb = await supabaseServer()
  let failed = true
  if (code) failed = Boolean((await sb.auth.exchangeCodeForSession(code)).error)
  else if (tokenHash && type) failed = Boolean((await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error)

  return NextResponse.redirect(failed ? `${origin}/login?error=1` : `${origin}${next}`)
}
