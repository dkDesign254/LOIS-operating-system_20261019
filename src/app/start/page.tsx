import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { Assessment } from './assessment'

export const metadata = { title: 'Get started' }

export default async function Start() {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login?next=/start')
  return <Assessment email={user.email ?? ''} />
}
