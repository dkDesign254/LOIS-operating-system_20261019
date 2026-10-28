'use server'
import { revalidatePath } from 'next/cache'
import { getCtx } from '@/lib/session'
import { analyse, parseBrief } from '@/lib/brief'

export async function saveMyBrief(payload: string): Promise<{ error?: string; message?: string }> {
  const ctx = await getCtx()
  if (!ctx.ws) return { error: 'Create your workspace first.' }
  if (payload.length > 15000) return { error: 'That brief is too large.' }
  let parsed
  try { parsed = parseBrief(JSON.parse(payload)) } catch { parsed = null }
  if (!parsed || parsed.decision.trim().length < 3) return { error: 'Add the decision first.' }
  const r = analyse(parsed)
  const { error } = await ctx.sb.from('lois_my_briefs').insert({ tenant_id: ctx.ws.tenant_id, title: parsed.decision.trim().slice(0, 200), payload: parsed, score: r.score })
  if (error) return { error: 'Could not save. Try again shortly.' }
  revalidatePath('/app/briefs')
  return { message: 'Saved to your workspace.' }
}

export async function deleteMyBrief(fd: FormData) {
  const ctx = await getCtx()
  await ctx.sb.from('lois_my_briefs').delete().eq('brief_id', String(fd.get('id') ?? '')).eq('user_id', ctx.user.id)
  revalidatePath('/app/briefs')
}
