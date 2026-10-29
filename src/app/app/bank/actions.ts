'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'
import { indexEmbeddings } from '@/lib/embed'
import { neonLog } from '@/lib/neon'
import { dispatch } from '@/lib/webhooks'

const R = '/app/bank/review'
const go = (id: string | null, extra = '') => redirect(id ? `${R}?id=${id}${extra}` : `${R}?done=1`)

async function pendingIds(ctx: Awaited<ReturnType<typeof requireWorkspace>>) {
  const { data } = await ctx.sb.from('lois_knowledge_items').select('knowledge_id').eq('tenant_id', ctx.ws.tenant_id).eq('status', 'pending_review').order('created_at', { ascending: true }).order('knowledge_id').limit(1000)
  return (data ?? []).map((r) => r.knowledge_id as string)
}

/** Accept, reject or skip one entry, then open the next one waiting. The decision is saved first; extras never undo it. */
export async function decideAndNext(decision: string, fd: FormData) {
  const ctx = await requireWorkspace()
  const id = String(fd.get('id') ?? '').slice(0, 64)
  const note = String(fd.get('note') ?? '').trim().slice(0, 1000)
  if (!ctx.isReviewer) redirect('/app/bank')

  const before = await pendingIds(ctx)
  const at = before.indexOf(id)
  const after = before.filter((x) => x !== id)
  const next = after.length ? (at >= 0 && at < after.length ? after[at] : after[0]) : null

  if (decision === 'skip') return go(next ?? id)
  if (!['approved', 'rejected'].includes(decision)) return go(id, '&error=' + encodeURIComponent('Choose Accept, Reject or Skip.'))
  if (decision === 'rejected' && note.length < 5) return go(id, '&error=' + encodeURIComponent('Say briefly why you are rejecting it (5+ characters), so the author can learn from it.'))

  const { data: cur } = await ctx.sb.from('lois_knowledge_items').select('metadata').eq('knowledge_id', id).eq('tenant_id', ctx.ws.tenant_id).maybeSingle()
  if (!cur) return go(next ?? null, next ? '&error=' + encodeURIComponent('That entry could not be found.') : '')
  const metadata = { ...(cur.metadata ?? {}), review: { decision, note: note || null, by: ctx.user.email ?? ctx.user.id, at: new Date().toISOString() } }
  const { data, error } = await ctx.sb.from('lois_knowledge_items').update({ status: decision, metadata }).eq('knowledge_id', id).eq('status', 'pending_review').select('knowledge_id')
  if (error) {
    const why = error.message.includes('second reviewer') ? 'A second reviewer must approve this one.' : error.message.includes('reviewer role') ? 'Only reviewers, admins and owners can do this.' : 'Could not save that decision. Try again.'
    return go(id, '&error=' + encodeURIComponent(why))
  }
  if (!data?.length) return go(next, '&error=' + encodeURIComponent('That entry was already reviewed by someone else. Here is the next one.'))
  try {
    if (decision === 'approved') await indexEmbeddings(ctx.sb, ctx.ws.tenant_id, 1)
    await neonLog('bank.' + decision, { tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, ref: id })
    await dispatch(ctx.sb, ctx.ws.tenant_id, decision === 'approved' ? 'knowledge.approved' : 'knowledge.rejected', { knowledge_id: id })
  } catch {}
  revalidatePath('/app/bank')
  revalidatePath('/app', 'layout')
  go(next, '&saved=' + decision)
}

export type IndexState = { ok?: boolean; message?: string; error?: string } | null

/** Rebuilds the search index for accepted entries and says plainly what happened. */
export async function rebuildIndex(_: IndexState): Promise<IndexState> {
  const ctx = await requireWorkspace()
  if (!ctx.isReviewer) return { error: 'Only reviewers, admins and owners can do this.' }
  const { indexReport } = await import('@/lib/embed')
  const r = await indexReport(ctx.sb, ctx.ws.tenant_id)
  const { count } = await ctx.sb.from('lois_knowledge_items').select('knowledge_id', { count: 'exact', head: true }).eq('tenant_id', ctx.ws.tenant_id).eq('status', 'approved').is('embedding', null)
  revalidatePath('/app/bank')
  if (r.error) return { error: `${r.error}. Indexed ${r.done} this time; ${count ?? '?'} still waiting. Answers still work, using word search instead of meaning search.` }
  return { ok: true, message: `Indexed ${r.done}. ${count ?? 0} still waiting${count ? ', press again to continue' : '. Meaning search now covers every accepted entry'}.` }
}
