'use server'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { POLICY_VERSION, recommend, validAnswers, type Answers } from '@/lib/policy'

export type StartState = { error?: string } | null

export async function completeOnboarding(_: StartState, fd: FormData): Promise<StartState> {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login')

  if (fd.get('terms') !== 'on') return { error: 'Please tick the box to agree to the privacy notice and terms to continue.' }
  const a: Partial<Answers> = { intent: String(fd.get('intent') ?? ''), audience: String(fd.get('audience') ?? ''), org_type: String(fd.get('org_type') ?? '') }
  if (!validAnswers(a)) return { error: 'Please answer the three questions.' }
  const source = fd.get('source') === 'landing' ? 'landing' : 'app'
  const rec = recommend(a)

  const { error: cErr } = await sb.from('lois_consents').insert([
    { purpose: 'terms_privacy', policy_version: POLICY_VERSION, granted: true, source },
    { purpose: 'onboarding_profile', policy_version: POLICY_VERSION, granted: true, source },
    { purpose: 'product_updates', policy_version: POLICY_VERSION, granted: fd.get('updates') === 'on', source },
  ])
  if (cErr) return { error: 'We could not save your consent. Please try again.' }

  const { error } = await sb
    .from('lois_onboarding')
    .upsert({ user_id: user.id, ...a, source, recommended_path: rec.path, policy_version: POLICY_VERSION, completed_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { error: 'We could not save your answers. Please try again.' }

  redirect(rec.path)
}
