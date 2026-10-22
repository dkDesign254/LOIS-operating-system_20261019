import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

// Data-subject access: everything tied to the signed-in person, as JSON. RLS limits each query to their own rows.
export async function GET() {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return new NextResponse('Sign in first', { status: 401 })
  const [consents, onboarding, requests, memberships, grants] = await Promise.all([
    sb.from('lois_consents').select('*').eq('user_id', user.id),
    sb.from('lois_onboarding').select('*').eq('user_id', user.id),
    sb.from('lois_data_requests').select('*').eq('user_id', user.id),
    sb.from('lois_memberships').select('*').eq('user_id', user.id),
    sb.from('lois_member_grants').select('*').eq('user_id', user.id),
  ])
  const body = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email, created_at: user.created_at }, consents: consents.data, onboarding: onboarding.data, data_requests: requests.data, memberships: memberships.data, privilege_overrides: grants.data }
  return new NextResponse(JSON.stringify(body, null, 2), { headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="lois-my-data.json"', 'cache-control': 'no-store' } })
}
